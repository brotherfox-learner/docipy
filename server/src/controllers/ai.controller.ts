import { FastifyRequest, FastifyReply } from 'fastify'
import { pool } from '@/db'
import { AuthenticatedRequest } from '@/middlewares/auth.middleware'
import {
  generateSummary as aiSummary,
  generateQuiz as aiQuiz,
  generateFlashcards as aiFlashcards,
  generateKnowledgeGraph as aiKnowledgeGraph,
} from '@/services/ai.service'
import { ragChat, getChatHistory as fetchChatHistory } from '@/services/rag.service'
import {
  checkAIQueryLimit,
  incrementAIQuery,
  checkQuizLimit,
  canAddFlashcards,
} from '@/services/usage.service'

async function getDocumentOrFail(id: string, userId: string, reply: FastifyReply) {
  const { rows } = await pool.query(
    'SELECT * FROM documents WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
    [id, userId]
  )
  if (rows.length === 0) {
    reply.status(404).send({ statusCode: 404, message: 'Document not found' })
    return null
  }
  return rows[0] as { id: string; content: string; user_id: string }
}

export async function generateSummary(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id } = request.params as { id: string }

  const { allowed } = await checkAIQueryLimit(user.id, user.plan)
  if (!allowed) {
    return reply.status(429).send({
      statusCode: 429,
      message: 'Daily AI query limit reached. Upgrade to Pro for more.',
    })
  }

  const doc = await getDocumentOrFail(id, user.id, reply)
  if (!doc) return

  const existing = await pool.query('SELECT * FROM summaries WHERE document_id = $1', [id])
  if (existing.rows.length > 0) {
    return reply.send({ data: existing.rows[0] })
  }

  try {
    const result = await aiSummary(doc.content || '')

    const { rows } = await pool.query(
      `INSERT INTO summaries (document_id, summary_text, bullet_points, key_concepts)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        id,
        result.summaryText,
        JSON.stringify(result.bulletPoints ?? []),
        JSON.stringify(result.keyConcepts ?? []),
      ]
    )

    await incrementAIQuery(user.id)
    return reply.send({ data: rows[0] })
  } catch (err) {
    request.log.error(err)
    return reply.status(500).send({ statusCode: 500, message: 'AI service error. Please try again.' })
  }
}

export async function generateQuiz(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id } = request.params as { id: string }

  const { allowed } = await checkAIQueryLimit(user.id, user.plan)
  if (!allowed) {
    return reply.status(429).send({ statusCode: 429, message: 'Daily AI query limit reached.' })
  }

  const quizAllowed = await checkQuizLimit(user.id, user.plan, id)
  if (!quizAllowed) {
    return reply.status(403).send({
      statusCode: 403,
      message: 'Free plan: max 3 quizzes per document. Upgrade to Pro.',
    })
  }

  const doc = await getDocumentOrFail(id, user.id, reply)
  if (!doc) return

  const quizLang = parseFlashcardRequestLang(request.body)

  try {
    const questions = await aiQuiz(doc.content || '', quizLang)
    if (!Array.isArray(questions) || questions.length === 0) {
      return reply.status(500).send({ statusCode: 500, message: 'Invalid AI response for quiz.' })
    }

    const { rows: quizInsert } = await pool.query<{ id: string }>(
      'INSERT INTO quizzes (document_id) VALUES ($1) RETURNING id',
      [id]
    )
    const quizId = quizInsert[0]!.id

    for (const q of questions) {
      await pool.query(
        `INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, question_type)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          quizId,
          q.question,
          JSON.stringify(q.options ?? []),
          q.correctAnswer,
          q.questionType === 'true_false' ? 'true_false' : 'multiple_choice',
        ]
      )
    }

    await incrementAIQuery(user.id)

    const { rows } = await pool.query(`SELECT * FROM quiz_questions qq WHERE qq.quiz_id = $1`, [quizId])

    await pool.query(
      'UPDATE usage_limits SET quiz_generated = quiz_generated + 1 WHERE user_id = $1',
      [user.id]
    )

    return reply.send({ data: { quizId, questions: rows } })
  } catch (err) {
    request.log.error(err)
    return reply.status(500).send({ statusCode: 500, message: 'AI service error. Please try again.' })
  }
}

function normalizeQuizOptions(raw: unknown): unknown {
  if (raw == null) return []
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  }
  return raw
}

export async function listQuizzes(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id } = request.params as { id: string }

  const doc = await getDocumentOrFail(id, user.id, reply)
  if (!doc) return

  const { rows: quizRows } = await pool.query<{ id: string; document_id: string; created_at: Date }>(
    `SELECT q.id, q.document_id, q.created_at
     FROM quizzes q WHERE q.document_id = $1 ORDER BY q.created_at DESC`,
    [id]
  )

  const quizzes = []
  for (const q of quizRows) {
    const { rows: questions } = await pool.query(
      `SELECT id, quiz_id, question, options, correct_answer, question_type
       FROM quiz_questions WHERE quiz_id = $1 ORDER BY id ASC`,
      [q.id]
    )
    quizzes.push({
      id: q.id,
      document_id: q.document_id,
      created_at: q.created_at,
      questions: questions.map((row) => ({
        ...row,
        options: normalizeQuizOptions(row.options),
      })),
    })
  }

  return reply.send({ data: quizzes })
}

export async function generateFlashcards(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id } = request.params as { id: string }

  const { allowed } = await checkAIQueryLimit(user.id, user.plan)
  if (!allowed) {
    return reply.status(429).send({ statusCode: 429, message: 'Daily AI query limit reached.' })
  }

  const doc = await getDocumentOrFail(id, user.id, reply)
  if (!doc) return

  const { rows: countRows } = await pool.query<{ c: string }>(
    'SELECT COUNT(*)::text AS c FROM flashcards WHERE document_id = $1',
    [id]
  )
  const oldCount = Number(countRows[0]?.c ?? 0)
  if (oldCount > 0) {
    await pool.query('DELETE FROM flashcards WHERE document_id = $1', [id])
    await pool.query(
      'UPDATE usage_limits SET flashcards_generated = GREATEST(flashcards_generated - $1, 0) WHERE user_id = $2',
      [oldCount, user.id]
    )
  }

  const expectedBatch = 10
  const flashAllowed = await canAddFlashcards(user.id, user.plan, expectedBatch)
  if (!flashAllowed) {
    return reply.status(403).send({
      statusCode: 403,
      message: 'Free plan: flashcard generation would exceed your limit. Upgrade to Pro.',
    })
  }

  const cardLang = parseFlashcardRequestLang(request.body)

  try {
    const cards = await aiFlashcards(doc.content || '', cardLang)
    if (!Array.isArray(cards) || cards.length === 0) {
      return reply.status(500).send({ statusCode: 500, message: 'Invalid AI response for flashcards.' })
    }

    const batchAllowed = await canAddFlashcards(user.id, user.plan, cards.length)
    if (!batchAllowed) {
      return reply.status(403).send({
        statusCode: 403,
        message: 'Free plan: not enough flashcard quota for this batch. Upgrade to Pro.',
      })
    }

    const insertedCards: unknown[] = []
    for (const card of cards) {
      const { rows } = await pool.query(
        `INSERT INTO flashcards (document_id, question, answer)
         VALUES ($1, $2, $3) RETURNING *`,
        [id, card.question, card.answer]
      )
      insertedCards.push(rows[0])
    }

    await pool.query(
      'UPDATE usage_limits SET flashcards_generated = flashcards_generated + $1 WHERE user_id = $2',
      [cards.length, user.id]
    )

    await incrementAIQuery(user.id)
    return reply.send({ data: insertedCards })
  } catch (err) {
    request.log.error(err)
    return reply.status(500).send({ statusCode: 500, message: 'AI service error. Please try again.' })
  }
}

function parseFlashcardRequestLang(body: unknown): 'en' | 'th' {
  const b = body as { lang?: string } | undefined
  const raw = typeof b?.lang === 'string' ? b.lang.trim().toLowerCase() : ''
  return raw === 'th' ? 'th' : 'en'
}

function parseKnowledgeGraphLang(query: unknown): 'en' | 'th' {
  const q = query as { lang?: string } | undefined
  const raw = typeof q?.lang === 'string' ? q.lang.trim().toLowerCase() : ''
  return raw === 'th' ? 'th' : 'en'
}

function serializeGraphRow(row: Record<string, unknown>) {
  const nodes = row.nodes
  const edges = row.edges
  return {
    ...row,
    nodes: Array.isArray(nodes) ? nodes : [],
    edges: Array.isArray(edges) ? edges : [],
  }
}

export async function getKnowledgeGraph(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id } = request.params as { id: string }

  const doc = await getDocumentOrFail(id, user.id, reply)
  if (!doc) return

  const { rows } = await pool.query('SELECT * FROM knowledge_graphs WHERE document_id = $1', [id])
  if (rows.length === 0) {
    return reply.status(404).send({ statusCode: 404, message: 'Knowledge graph not generated yet' })
  }

  return reply.send({ data: serializeGraphRow(rows[0] as Record<string, unknown>) })
}

export async function generateKnowledgeGraph(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id } = request.params as { id: string }
  const q = request.query as { regenerate?: string; lang?: string }
  const regenerate = q.regenerate === 'true' || q.regenerate === '1'
  const lang = parseKnowledgeGraphLang(q)

  const { allowed } = await checkAIQueryLimit(user.id, user.plan)
  if (!allowed) {
    return reply.status(429).send({ statusCode: 429, message: 'Daily AI query limit reached.' })
  }

  const doc = await getDocumentOrFail(id, user.id, reply)
  if (!doc) return

  const existing = await pool.query('SELECT * FROM knowledge_graphs WHERE document_id = $1', [id])
  if (existing.rows.length > 0 && !regenerate) {
    return reply.send({ data: serializeGraphRow(existing.rows[0] as Record<string, unknown>) })
  }

  try {
    const graph = await aiKnowledgeGraph(doc.content || '', lang)

    if (existing.rows.length > 0 && regenerate) {
      await pool.query('DELETE FROM knowledge_graphs WHERE document_id = $1', [id])
    }

    const { rows } = await pool.query(
      `INSERT INTO knowledge_graphs (document_id, nodes, edges)
       VALUES ($1, $2, $3) RETURNING *`,
      [id, JSON.stringify(graph.nodes ?? []), JSON.stringify(graph.edges ?? [])]
    )

    await incrementAIQuery(user.id)
    return reply.send({ data: serializeGraphRow(rows[0] as Record<string, unknown>) })
  } catch (err) {
    request.log.error(err)
    return reply.status(500).send({ statusCode: 500, message: 'AI service error. Please try again.' })
  }
}

export async function listChatHistory(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id } = request.params as { id: string }

  const doc = await getDocumentOrFail(id, user.id, reply)
  if (!doc) return

  const history = await fetchChatHistory(id, user.id)
  return reply.send({ data: history })
}

export async function chatWithDocument(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id } = request.params as { id: string }
  const body = request.body as { question?: string; context?: string }

  const question = body?.question?.trim()
  if (!question) {
    return reply.status(400).send({ statusCode: 400, message: 'Question is required' })
  }
  const lessonContext =
    typeof body?.context === 'string' && body.context.trim().length > 0
      ? body.context.trim().slice(0, 5000)
      : undefined

  const { allowed } = await checkAIQueryLimit(user.id, user.plan)
  if (!allowed) {
    return reply.status(429).send({ statusCode: 429, message: 'Daily AI query limit reached.' })
  }

  const doc = await getDocumentOrFail(id, user.id, reply)
  if (!doc) return

  try {
    const answer = await ragChat(id, question, lessonContext ? { lessonContext } : undefined)

    await pool.query(
      `INSERT INTO ai_queries (user_id, document_id, question, answer)
       VALUES ($1, $2, $3, $4)`,
      [user.id, id, question, answer]
    )

    await incrementAIQuery(user.id)
    return reply.send({ data: { question, answer } })
  } catch (err) {
    request.log.error(err)
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('GOOGLE_AI_API_KEY') || msg.includes('GEMINI_API_KEY')) {
      return reply.status(503).send({
        statusCode: 503,
        message: 'AI is not configured on the server (missing GOOGLE_AI_API_KEY or GEMINI_API_KEY).',
      })
    }
    return reply.status(500).send({ statusCode: 500, message: 'AI service error. Please try again.' })
  }
}
