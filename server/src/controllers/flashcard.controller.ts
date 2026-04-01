import { FastifyRequest, FastifyReply } from 'fastify'
import { pool } from '@/db'
import { AuthenticatedRequest } from '@/middlewares/auth.middleware'

async function assertDocumentOwned(
  id: string,
  userId: string,
  reply: FastifyReply
): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT id FROM documents WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
    [id, userId]
  )
  if (rows.length === 0) {
    reply.status(404).send({ statusCode: 404, message: 'Document not found' })
    return false
  }
  return true
}

export async function listFlashcards(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id } = request.params as { id: string }

  if (!(await assertDocumentOwned(id, user.id, reply))) return

  const { rows } = await pool.query(
    'SELECT * FROM flashcards WHERE document_id = $1 ORDER BY created_at ASC',
    [id]
  )
  return reply.send({ data: rows })
}

export async function resetFlashcards(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id } = request.params as { id: string }

  if (!(await assertDocumentOwned(id, user.id, reply))) return

  await pool.query('UPDATE flashcards SET is_mastered = FALSE WHERE document_id = $1', [id])
  return reply.send({ data: { message: 'Flashcard progress reset' } })
}

export async function updateMastered(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id } = request.params as { id: string }
  const body = request.body as { is_mastered?: boolean }
  const is_mastered = body?.is_mastered
  if (typeof is_mastered !== 'boolean') {
    return reply.status(400).send({ statusCode: 400, message: 'is_mastered (boolean) is required' })
  }

  const { rowCount } = await pool.query(
    `UPDATE flashcards f
     SET is_mastered = $1
     FROM documents d
     WHERE f.id = $2
       AND f.document_id = d.id
       AND d.user_id = $3
       AND d.deleted_at IS NULL`,
    [is_mastered, id, user.id]
  )

  if (!rowCount) {
    return reply.status(404).send({ statusCode: 404, message: 'Flashcard not found' })
  }

  return reply.send({ data: { id, is_mastered } })
}
