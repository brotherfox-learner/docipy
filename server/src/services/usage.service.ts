import { pool } from '@/db'

const FREE_LIMITS = {
  documents: 5,
  ai_queries: 10,
  quiz: 3,
  flashcards: 20,
}

export async function checkDocumentLimit(
  userId: string,
  plan: 'free' | 'pro'
): Promise<boolean> {
  if (plan === 'pro') return true

  const { rows } = await pool.query(
    'SELECT documents_count FROM usage_limits WHERE user_id = $1',
    [userId]
  )

  if (rows.length === 0) return true
  return rows[0].documents_count < FREE_LIMITS.documents
}

export async function checkAIQueryLimit(
  userId: string,
  plan: 'free' | 'pro'
): Promise<{ allowed: boolean; remaining: number }> {
  if (plan === 'pro') return { allowed: true, remaining: 100 }

  const { rows } = await pool.query(
    `SELECT ai_queries_today, reset_at FROM usage_limits WHERE user_id = $1`,
    [userId]
  )

  if (rows.length === 0) return { allowed: true, remaining: FREE_LIMITS.ai_queries }

  const usage = rows[0]
  const lastReset = new Date(usage.reset_at)
  const now = new Date()

  // Reset if last reset was yesterday (UTC)
  if (now.toDateString() !== lastReset.toDateString()) {
    await pool.query(
      'UPDATE usage_limits SET ai_queries_today = 0, reset_at = NOW() WHERE user_id = $1',
      [userId]
    )
    return { allowed: true, remaining: FREE_LIMITS.ai_queries }
  }

  const remaining = FREE_LIMITS.ai_queries - usage.ai_queries_today
  return { allowed: remaining > 0, remaining }
}

export async function incrementAIQuery(userId: string) {
  await pool.query(
    'UPDATE usage_limits SET ai_queries_today = ai_queries_today + 1 WHERE user_id = $1',
    [userId]
  )
}

export async function checkQuizLimit(
  userId: string,
  plan: 'free' | 'pro',
  documentId: string
): Promise<boolean> {
  if (plan === 'pro') return true

  const { rows } = await pool.query(
    `SELECT COUNT(*) FROM quizzes WHERE document_id = $1`,
    [documentId]
  )

  return Number(rows[0].count) < FREE_LIMITS.quiz
}

export async function checkFlashcardLimit(
  userId: string,
  plan: 'free' | 'pro'
): Promise<boolean> {
  if (plan === 'pro') return true

  const { rows } = await pool.query(
    'SELECT flashcards_generated FROM usage_limits WHERE user_id = $1',
    [userId]
  )

  if (rows.length === 0) return true
  return rows[0].flashcards_generated < FREE_LIMITS.flashcards
}

/** Free plan: total generated flashcards + batch must not exceed cap */
export async function canAddFlashcards(
  userId: string,
  plan: 'free' | 'pro',
  countToAdd: number
): Promise<boolean> {
  if (plan === 'pro') return true
  if (countToAdd <= 0) return true

  const { rows } = await pool.query(
    'SELECT flashcards_generated FROM usage_limits WHERE user_id = $1',
    [userId]
  )

  const used = rows.length === 0 ? 0 : Number(rows[0].flashcards_generated)
  return used + countToAdd <= FREE_LIMITS.flashcards
}
