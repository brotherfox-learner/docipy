import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { pool } from '@/db'

const banBodySchema = z.object({
  is_active: z.boolean(),
})

export async function listUsers(request: FastifyRequest, reply: FastifyReply) {
  const q = request.query as { page?: string; limit?: string; search?: string; plan?: string }
  const page = q.page ?? '1'
  const limit = q.limit ?? '20'
  const search = q.search ?? ''
  const plan = q.plan ?? ''
  const offset = (Number(page) - 1) * Number(limit)

  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.name, u.avatar_url, u.plan, u.is_verified, u.is_active, u.created_at,
       COALESCE(ul.documents_count, 0) AS documents_count,
       COALESCE(ul.ai_queries_today, 0) AS ai_queries_today,
       s.status AS subscription_status,
       (SELECT MAX(rt.created_at) FROM refresh_tokens rt WHERE rt.user_id = u.id) AS last_active_at
     FROM users u
     LEFT JOIN usage_limits ul ON ul.user_id = u.id
     LEFT JOIN subscriptions s ON s.user_id = u.id
     WHERE ($1 = '' OR u.email ILIKE '%' || $1 || '%' OR u.name ILIKE '%' || $1 || '%')
       AND ($2 = '' OR u.plan = $2::plan_type)
     ORDER BY u.created_at DESC
     LIMIT $3 OFFSET $4`,
    [search, plan, Number(limit), offset]
  )

  const countRow = await pool.query(
    `SELECT COUNT(*)::text AS c FROM users u
     WHERE ($1 = '' OR u.email ILIKE '%' || $1 || '%' OR u.name ILIKE '%' || $1 || '%')
       AND ($2 = '' OR u.plan::text = $2)`,
    [search, plan]
  )

  return reply.send({
    data: {
      users: rows,
      total: Number(countRow.rows[0]?.c ?? 0),
      page: Number(page),
      limit: Number(limit),
    },
  })
}

export async function banUser(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const parsed = banBodySchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send({ statusCode: 400, message: 'Body must include is_active (boolean)' })
  }
  const { is_active } = parsed.data

  const { rows } = await pool.query(
    'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, is_active',
    [is_active, id]
  )

  if (rows.length === 0) {
    return reply.status(404).send({ statusCode: 404, message: 'User not found' })
  }

  return reply.send({ data: rows[0] })
}

export async function getUserById(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }

  const { rows: userRows } = await pool.query(
    `SELECT u.id, u.email, u.name, u.avatar_url, u.plan, u.is_verified, u.is_active,
            u.created_at, u.updated_at, u.oauth_provider,
            COALESCE(ul.ai_queries_today, 0) AS ai_queries_today,
            COALESCE(ul.flashcards_generated, 0) AS flashcards_generated,
            COALESCE(ul.quiz_generated, 0) AS quiz_generated,
            COALESCE(ul.documents_count, 0) AS documents_count,
            ul.reset_at AS usage_reset_at,
            (SELECT MAX(rt.created_at) FROM refresh_tokens rt WHERE rt.user_id = u.id) AS last_active_at,
            s.status AS subscription_status,
            s.current_period_end,
            s.stripe_customer_id
     FROM users u
     LEFT JOIN usage_limits ul ON ul.user_id = u.id
     LEFT JOIN subscriptions s ON s.user_id = u.id
     WHERE u.id = $1`,
    [id]
  )

  if (userRows.length === 0) {
    return reply.status(404).send({ statusCode: 404, message: 'User not found' })
  }

  const u = userRows[0] as Record<string, unknown>

  const [aiTotal, docAgg, fcCount, quizCount] = await Promise.all([
    pool.query(`SELECT COUNT(*)::text AS c FROM ai_queries WHERE user_id = $1`, [id]),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE deleted_at IS NULL)::text AS active_docs,
         COALESCE(SUM(word_count) FILTER (WHERE deleted_at IS NULL), 0)::text AS total_words
       FROM documents WHERE user_id = $1`,
      [id]
    ),
    pool.query(
      `SELECT COUNT(*)::text AS c FROM flashcards f
       INNER JOIN documents d ON d.id = f.document_id
       WHERE d.user_id = $1 AND d.deleted_at IS NULL`,
      [id]
    ),
    pool.query(
      `SELECT COUNT(*)::text AS c FROM quizzes q
       INNER JOIN documents d ON d.id = q.document_id
       WHERE d.user_id = $1 AND d.deleted_at IS NULL`,
      [id]
    ),
  ])

  const user = {
    id: u.id,
    email: u.email,
    name: u.name,
    avatar_url: u.avatar_url,
    plan: u.plan,
    is_verified: u.is_verified,
    is_active: u.is_active,
    created_at: u.created_at,
    updated_at: u.updated_at,
    oauth_provider: u.oauth_provider,
    ai_queries_today: Number(u.ai_queries_today),
    flashcards_generated: Number(u.flashcards_generated),
    quiz_generated: Number(u.quiz_generated),
    documents_count: Number(u.documents_count),
    usage_reset_at: u.usage_reset_at,
    last_active_at: u.last_active_at,
    subscription_status: u.subscription_status,
    current_period_end: u.current_period_end,
    stripe_customer_id: u.stripe_customer_id,
  }

  return reply.send({
    data: {
      user,
      stats: {
        ai_queries_total: Number(aiTotal.rows[0]?.c ?? 0),
        documents_active: Number(docAgg.rows[0]?.active_docs ?? 0),
        total_word_count: Number(docAgg.rows[0]?.total_words ?? 0),
        flashcards_total: Number(fcCount.rows[0]?.c ?? 0),
        quizzes_total: Number(quizCount.rows[0]?.c ?? 0),
      },
    },
  })
}

export async function getStats(_request: FastifyRequest, reply: FastifyReply) {
  const [usersRow, docsRow, proRow, queriesRow] = await Promise.all([
    pool.query(`SELECT COUNT(*)::text AS c FROM users WHERE is_active = TRUE`),
    pool.query(`SELECT COUNT(*)::text AS c FROM documents WHERE deleted_at IS NULL`),
    pool.query(`SELECT COUNT(*)::text AS c FROM users WHERE plan = 'pro'`),
    pool.query(`SELECT COALESCE(SUM(ai_queries_today), 0)::text AS s FROM usage_limits`),
  ])

  return reply.send({
    data: {
      totalUsers: Number(usersRow.rows[0]?.c ?? 0),
      totalDocuments: Number(docsRow.rows[0]?.c ?? 0),
      proUsers: Number(proRow.rows[0]?.c ?? 0),
      totalAIQueriesToday: Number(queriesRow.rows[0]?.s ?? 0),
    },
  })
}
