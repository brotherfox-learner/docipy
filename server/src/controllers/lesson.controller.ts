import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { pool } from '@/db'
import { AuthenticatedRequest } from '@/middlewares/auth.middleware'
import { generateFullLearningPath } from '@/services/lesson.service'
import { checkAIQueryLimit, incrementAIQuery } from '@/services/usage.service'

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function nextStreak(prevStreak: number, lastActivityAt: string | null): number {
  if (!lastActivityAt) return 1
  const last = new Date(lastActivityAt)
  const now = new Date()
  const lastDay = startOfUtcDay(last)
  const today = startOfUtcDay(now)
  const diffDays = Math.round((today - lastDay) / 86400000)
  if (diffDays === 0) return prevStreak
  if (diffDays === 1) return prevStreak + 1
  return 1
}

function xpForNodeType(nodeType: string): number {
  if (nodeType === 'quiz') return 25
  if (nodeType === 'flashcard') return 20
  return 15
}

async function getDocOr404(id: string, userId: string, reply: FastifyReply) {
  const { rows } = await pool.query(
    'SELECT id, content FROM documents WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
    [id, userId]
  )
  if (rows.length === 0) {
    reply.status(404).send({ statusCode: 404, message: 'Document not found' })
    return null
  }
  return rows[0] as { id: string; content: string }
}

export async function getLearningPath(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id: documentId } = request.params as { id: string }

  const doc = await getDocOr404(documentId, user.id, reply)
  if (!doc) return

  const pathRes = await pool.query(
    `SELECT * FROM learning_paths WHERE document_id = $1 AND user_id = $2`,
    [documentId, user.id]
  )
  if (pathRes.rows.length === 0) {
    return reply.send({ data: null })
  }

  const path = pathRes.rows[0] as Record<string, unknown>
  const pathId = path.id as string

  const nodesRes = await pool.query(
    `SELECT * FROM lesson_nodes WHERE learning_path_id = $1 ORDER BY order_index ASC`,
    [pathId]
  )

  const progRes = await pool.query(
    `SELECT * FROM learning_progress WHERE learning_path_id = $1 AND user_id = $2`,
    [pathId, user.id]
  )

  return reply.send({
    data: {
      path,
      nodes: nodesRes.rows,
      progress: progRes.rows[0] ?? null,
    },
  })
}

const postBodySchema = z.object({
  language: z.enum(['en', 'th']).optional(),
  regenerate: z.boolean().optional(),
})

export async function postLearningPath(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id: documentId } = request.params as { id: string }
  const parsedBody = postBodySchema.safeParse(request.body ?? {})
  if (!parsedBody.success) {
    return reply.status(400).send({ statusCode: 400, message: 'Invalid body' })
  }
  const language = parsedBody.data.language ?? 'en'
  const regenerate = parsedBody.data.regenerate === true

  const doc = await getDocOr404(documentId, user.id, reply)
  if (!doc) return

  const content = doc.content || ''
  if (!content.trim()) {
    return reply.status(400).send({
      statusCode: 400,
      message: 'Document has no text content. Add or upload content first.',
    })
  }

  const existing = await pool.query(
    `SELECT * FROM learning_paths WHERE document_id = $1 AND user_id = $2`,
    [documentId, user.id]
  )

  if (existing.rows.length > 0) {
    const row = existing.rows[0] as { id: string; status: string; updated_at: string }

    if (row.status === 'generating' && !regenerate) {
      const updated = new Date(row.updated_at).getTime()
      const STALE_MS = 2 * 60 * 1000
      if (Date.now() - updated < STALE_MS) {
        return reply.status(409).send({
          statusCode: 409,
          message: 'Learning path generation is already in progress. Please wait.',
        })
      }
    }

    if (row.status === 'ready' && !regenerate) {
      const pathId = row.id
      const nodesRes = await pool.query(
        `SELECT * FROM lesson_nodes WHERE learning_path_id = $1 ORDER BY order_index ASC`,
        [pathId]
      )
      const progRes = await pool.query(
        `SELECT * FROM learning_progress WHERE learning_path_id = $1 AND user_id = $2`,
        [pathId, user.id]
      )
      return reply.send({
        data: {
          path: existing.rows[0],
          nodes: nodesRes.rows,
          progress: progRes.rows[0] ?? null,
        },
      })
    }

    await pool.query(`DELETE FROM learning_paths WHERE id = $1`, [row.id])
  }

  const { allowed } = await checkAIQueryLimit(user.id, user.plan)
  if (!allowed) {
    return reply.status(429).send({
      statusCode: 429,
      message: 'Daily AI query limit reached. Upgrade to Pro for more.',
    })
  }

  const insertPath = await pool.query(
    `INSERT INTO learning_paths (document_id, user_id, title, description, total_nodes, status, language)
     VALUES ($1, $2, $3, $4, 0, 'generating', $5)
     RETURNING *`,
    [documentId, user.id, 'Generating…', '', language]
  )
  const pathRow = insertPath.rows[0] as { id: string }
  const pathId = pathRow.id
  const userId = user.id

  runGenerationInBackground(pathId, userId, content, language, request.log)

  return reply.status(202).send({
    data: {
      path: insertPath.rows[0],
      nodes: [],
      progress: null,
    },
  })
}

function runGenerationInBackground(
  pathId: string,
  userId: string,
  content: string,
  language: 'en' | 'th',
  log: { error: (...args: unknown[]) => void; info: (...args: unknown[]) => void }
) {
  void (async () => {
    try {
      const generated = await generateFullLearningPath(content, language)

      await pool.query(`DELETE FROM lesson_nodes WHERE learning_path_id = $1`, [pathId])

      for (let i = 0; i < generated.nodes.length; i++) {
        const n = generated.nodes[i]!
        await pool.query(
          `INSERT INTO lesson_nodes (learning_path_id, order_index, title, node_type, content)
           VALUES ($1, $2, $3, $4, $5::jsonb)`,
          [pathId, i, n.title, n.nodeType, JSON.stringify(n.content ?? {})]
        )
      }

      await pool.query(
        `UPDATE learning_paths
         SET title = $1, description = $2, total_nodes = $3, status = 'ready', error_message = NULL, updated_at = NOW()
         WHERE id = $4`,
        [generated.pathTitle, generated.pathDescription, generated.nodes.length, pathId]
      )

      await incrementAIQuery(userId)
      log.info({ pathId }, 'Learning path generation complete')
    } catch (err) {
      log.error({ err, pathId }, 'Learning path generation failed')
      const msg = err instanceof Error ? err.message : 'Generation failed'
      await pool.query(
        `UPDATE learning_paths SET status = 'error', error_message = $1, updated_at = NOW() WHERE id = $2`,
        [msg.slice(0, 2000), pathId]
      ).catch(() => { /* swallow */ })
    }
  })()
}

const patchProgressSchema = z.object({
  current_node_index: z.number().int().min(0).optional(),
})

export async function patchLearningPathProgress(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id: documentId } = request.params as { id: string }
  const parsed = patchProgressSchema.safeParse(request.body ?? {})
  if (!parsed.success) {
    return reply.status(400).send({ statusCode: 400, message: 'Invalid body' })
  }

  const pathRes = await pool.query(
    `SELECT * FROM learning_paths WHERE document_id = $1 AND user_id = $2 AND status = 'ready'`,
    [documentId, user.id]
  )
  if (pathRes.rows.length === 0) {
    return reply.status(404).send({ statusCode: 404, message: 'No ready learning path for this document' })
  }
  const path = pathRes.rows[0] as { id: string; total_nodes: number }

  const { current_node_index } = parsed.data
  if (current_node_index === undefined) {
    return reply.status(400).send({ statusCode: 400, message: 'current_node_index required' })
  }

  const capped = Math.min(current_node_index, Math.max(0, path.total_nodes - 1))

  await pool.query(
    `INSERT INTO learning_progress (user_id, learning_path_id, current_node_index, completed_node_ids, xp_earned, streak_count)
     VALUES ($1, $2, $3, '[]'::jsonb, 0, 0)
     ON CONFLICT (user_id, learning_path_id)
     DO UPDATE SET current_node_index = EXCLUDED.current_node_index`,
    [user.id, path.id, capped]
  )

  const prog = await pool.query(
    `SELECT * FROM learning_progress WHERE user_id = $1 AND learning_path_id = $2`,
    [user.id, path.id]
  )

  return reply.send({ data: prog.rows[0] })
}

export async function patchLearningPathNodeComplete(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id: documentId, nodeId } = request.params as { id: string; nodeId: string }
  if (!z.string().uuid().safeParse(nodeId).success) {
    return reply.status(400).send({ statusCode: 400, message: 'Invalid node id' })
  }

  const pathRes = await pool.query(
    `SELECT * FROM learning_paths WHERE document_id = $1 AND user_id = $2 AND status = 'ready'`,
    [documentId, user.id]
  )
  if (pathRes.rows.length === 0) {
    return reply.status(404).send({ statusCode: 404, message: 'No ready learning path for this document' })
  }
  const path = pathRes.rows[0] as { id: string; total_nodes: number }

  const nodeRes = await pool.query(
    `SELECT * FROM lesson_nodes WHERE id = $1 AND learning_path_id = $2`,
    [nodeId, path.id]
  )
  if (nodeRes.rows.length === 0) {
    return reply.status(404).send({ statusCode: 404, message: 'Lesson node not found' })
  }
  const node = nodeRes.rows[0] as { id: string; order_index: number; node_type: string }

  const existingProg = await pool.query(
    `SELECT * FROM learning_progress WHERE user_id = $1 AND learning_path_id = $2`,
    [user.id, path.id]
  )

  let completedIds: string[] = []
  let xp = 0
  let streak = 0
  let lastAt: string | null = null

  if (existingProg.rows.length > 0) {
    const p = existingProg.rows[0] as {
      completed_node_ids: unknown
      xp_earned: number
      streak_count: number
      last_activity_at: string | null
    }
    completedIds = Array.isArray(p.completed_node_ids)
      ? (p.completed_node_ids as string[]).filter((x) => typeof x === 'string')
      : []
    xp = Number(p.xp_earned) || 0
    streak = Number(p.streak_count) || 0
    lastAt = p.last_activity_at
  }

  const already = completedIds.includes(nodeId)
  if (already) {
    const prog = await pool.query(
      `SELECT * FROM learning_progress WHERE user_id = $1 AND learning_path_id = $2`,
      [user.id, path.id]
    )
    return reply.send({
      data: {
        progress: prog.rows[0] ?? null,
        xp_gained: 0,
      },
    })
  }

  completedIds = [...completedIds, nodeId]
  xp += xpForNodeType(node.node_type)
  streak = nextStreak(streak, lastAt)

  const newIndex = Math.min(
    Math.max(node.order_index + 1, 0),
    Math.max(0, path.total_nodes - 1)
  )

  await pool.query(
    `INSERT INTO learning_progress (user_id, learning_path_id, current_node_index, completed_node_ids, xp_earned, streak_count, last_activity_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, NOW())
     ON CONFLICT (user_id, learning_path_id)
     DO UPDATE SET
       current_node_index = GREATEST(learning_progress.current_node_index, EXCLUDED.current_node_index),
       completed_node_ids = EXCLUDED.completed_node_ids,
       xp_earned = EXCLUDED.xp_earned,
       streak_count = EXCLUDED.streak_count,
       last_activity_at = NOW()`,
    [user.id, path.id, newIndex, JSON.stringify(completedIds), xp, streak]
  )

  const prog = await pool.query(
    `SELECT * FROM learning_progress WHERE user_id = $1 AND learning_path_id = $2`,
    [user.id, path.id]
  )

  return reply.send({
    data: {
      progress: prog.rows[0],
      xp_gained: already ? 0 : xpForNodeType(node.node_type),
    },
  })
}

export async function getLearningDashboardStats(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const empty = { total_xp: 0, best_streak: 0, paths_with_progress: 0, nodes_completed: 0 }

  try {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(lp.xp_earned), 0)::int AS total_xp,
         COALESCE(MAX(lp.streak_count), 0)::int AS best_streak,
         COUNT(DISTINCT lp.learning_path_id)::int AS paths_with_progress,
         COALESCE(SUM(
           CASE
             WHEN jsonb_typeof(lp.completed_node_ids) = 'array'
             THEN jsonb_array_length(lp.completed_node_ids)
             ELSE 0
           END
         ), 0)::int AS nodes_completed
       FROM learning_progress lp
       WHERE lp.user_id = $1`,
      [user.id]
    )
    return reply.send({ data: rows[0] ?? empty })
  } catch (err) {
    request.log.warn({ err }, 'learning_progress query failed — table may not exist yet')
    return reply.send({ data: empty })
  }
}
