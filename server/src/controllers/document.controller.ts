import { randomUUID } from 'node:crypto'
import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { pool } from '@/db'
import { AuthenticatedRequest } from '@/middlewares/auth.middleware'
import {
  formatS3ClientError,
  uploadToS3,
  extractTextFromFile,
  resolveUploadMimeType,
  MIME_PDF,
} from '@/services/file.service'
import { extractContentFromUrl } from '@/services/scrape.service'
import { checkDocumentLimit } from '@/services/usage.service'
import { indexDocumentChunks } from '@/services/rag.service'

// ── List Documents ────────────────────────────────────────────
export async function listDocuments(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { page = '1', limit = '10', search = '' } = request.query as any

  const offset = (Number(page) - 1) * Number(limit)

  const countQuery = await pool.query(
    `SELECT COUNT(*) FROM documents
     WHERE user_id = $1 AND deleted_at IS NULL
       AND ($2 = '' OR title ILIKE '%' || $2 || '%')`,
    [user.id, search]
  )

  const { rows } = await pool.query(
    `SELECT d.id, d.title, d.word_count, d.file_url, d.created_at, d.updated_at,
            (SELECT COUNT(*)::int FROM flashcards f WHERE f.document_id = d.id) AS flashcard_count,
            (SELECT COUNT(*)::int FROM quizzes q WHERE q.document_id = d.id) AS quiz_count
     FROM documents d
     WHERE d.user_id = $1 AND d.deleted_at IS NULL
       AND ($2 = '' OR d.title ILIKE '%' || $2 || '%')
     ORDER BY d.created_at DESC
     LIMIT $3 OFFSET $4`,
    [user.id, search, Number(limit), offset]
  )

  return reply.send({
    data: {
      documents: rows,
      total: Number(countQuery.rows[0].count),
      page: Number(page),
      limit: Number(limit),
    },
  })
}

// ── Get Document ──────────────────────────────────────────────
export async function getDocument(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id } = request.params as { id: string }

  const { rows } = await pool.query(
    `SELECT d.*,
       s.summary_text, s.bullet_points, s.key_concepts,
       (SELECT COUNT(*) FROM quiz_questions qq JOIN quizzes q ON q.id = qq.quiz_id WHERE q.document_id = d.id) AS quiz_count,
       (SELECT COUNT(*) FROM flashcards f WHERE f.document_id = d.id) AS flashcard_count
     FROM documents d
     LEFT JOIN summaries s ON s.document_id = d.id
     WHERE d.id = $1 AND d.user_id = $2 AND d.deleted_at IS NULL`,
    [id, user.id]
  )

  if (rows.length === 0) {
    return reply.status(404).send({ statusCode: 404, message: 'Document not found' })
  }

  return reply.send({ data: rows[0] })
}

// ── Create Document ───────────────────────────────────────────
const createSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
})

export async function createDocument(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const parsed = createSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send({ statusCode: 400, message: parsed.error.issues[0].message })
  }

  // Check free plan limit (5 documents)
  const allowed = await checkDocumentLimit(user.id, user.plan)
  if (!allowed) {
    return reply.status(403).send({
      statusCode: 403,
      message: 'You have reached the free plan limit of 5 documents. Please upgrade to Pro.',
    })
  }

  const { title, content } = parsed.data
  const wordCount = content.split(/\s+/).filter(Boolean).length

  const { rows } = await pool.query(
    `INSERT INTO documents (user_id, title, content, word_count)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [user.id, title, content, wordCount]
  )

  // Increment documents_count in usage_limits
  await pool.query(
    'UPDATE usage_limits SET documents_count = documents_count + 1 WHERE user_id = $1',
    [user.id]
  )

  const created = rows[0] as { id: string; content: string }
  indexDocumentChunks(created.id, content).catch((err) =>
    request.log.error({ err }, 'indexDocumentChunks failed after create')
  )

  return reply.status(201).send({ data: rows[0] })
}

// ── Create document from URL (Readability main content) ───────
const fromUrlSchema = z.object({
  url: z.string().url().max(2048),
  title: z.string().min(1).max(500).optional(),
})

export async function createDocumentFromUrl(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const parsed = fromUrlSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid input' })
  }

  const allowed = await checkDocumentLimit(user.id, user.plan)
  if (!allowed) {
    return reply.status(403).send({
      statusCode: 403,
      message: 'You have reached the free plan limit of 5 documents. Please upgrade to Pro.',
    })
  }

  let extracted: Awaited<ReturnType<typeof extractContentFromUrl>>
  try {
    extracted = await extractContentFromUrl(parsed.data.url.trim())
  } catch (err) {
    request.log.warn({ err }, 'extractContentFromUrl failed')
    const message =
      err instanceof Error ? err.message : 'Could not fetch or extract content from this URL.'
    return reply.status(400).send({ statusCode: 400, message })
  }

  const customTitle = parsed.data.title?.trim()
  const title = (customTitle && customTitle.length > 0 ? customTitle : extracted.title).slice(0, 500)
  const content = extracted.content
  const wordCount = content.split(/\s+/).filter(Boolean).length
  const sourceUrl = extracted.sourceUrl

  const { rows } = await pool.query(
    `INSERT INTO documents (user_id, title, content, file_url, word_count)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [user.id, title, content, sourceUrl, wordCount]
  )

  await pool.query('UPDATE usage_limits SET documents_count = documents_count + 1 WHERE user_id = $1', [
    user.id,
  ])

  const created = rows[0] as { id: string; content: string }
  indexDocumentChunks(created.id, content).catch((err) =>
    request.log.error({ err }, 'indexDocumentChunks failed after from-url')
  )

  return reply.status(201).send({ data: rows[0] })
}

// ── Update Document ───────────────────────────────────────────
const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
})

export async function updateDocument(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id } = request.params as { id: string }
  const parsed = updateSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send({ statusCode: 400, message: 'Invalid input' })
  }

  // Verify ownership
  const existing = await pool.query(
    'SELECT id FROM documents WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
    [id, user.id]
  )
  if (existing.rows.length === 0) {
    return reply.status(404).send({ statusCode: 404, message: 'Document not found' })
  }

  const { title, content } = parsed.data
  const wordCount = content ? content.split(/\s+/).filter(Boolean).length : undefined

  const { rows } = await pool.query(
    `UPDATE documents
     SET title = COALESCE($1, title),
         content = COALESCE($2, content),
         word_count = COALESCE($3, word_count),
         updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [title, content, wordCount, id]
  )

  if (content !== undefined) {
    const updated = rows[0] as { id: string; content: string }
    indexDocumentChunks(updated.id, updated.content || '').catch((err) =>
      request.log.error({ err }, 'indexDocumentChunks failed after update')
    )
  }

  return reply.send({ data: rows[0] })
}

// ── Delete Document (Soft Delete) ─────────────────────────────
export async function deleteDocument(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id } = request.params as { id: string }

  const { rowCount } = await pool.query(
    `UPDATE documents SET deleted_at = NOW()
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [id, user.id]
  )

  if (rowCount === 0) {
    return reply.status(404).send({ statusCode: 404, message: 'Document not found' })
  }

  // Decrement usage count
  await pool.query(
    'UPDATE usage_limits SET documents_count = GREATEST(documents_count - 1, 0) WHERE user_id = $1',
    [user.id]
  )

  return reply.send({ data: { message: 'Document deleted' } })
}

// ── Upload Document (Pro Plan) ────────────────────────────────
export async function uploadDocument(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user

  let titleFromField: string | undefined
  let fileBuffer: Buffer | undefined
  let fileMimetype = ''
  let fileFilename = ''

  // toBuffer() MUST be called inside the for-await loop — calling it after the loop ends
  // causes the stream to hang forever because the underlying busboy stream is already closed.
  for await (const part of request.parts()) {
    if (part.type === 'field' && part.fieldname === 'title') {
      const s = String(part.value ?? '').trim()
      if (s) titleFromField = s.slice(0, 500)
    } else if (part.type === 'file' && !fileBuffer) {
      try {
        fileBuffer = await part.toBuffer()
      } catch (err) {
        request.log.error({ err }, 'multipart toBuffer failed')
        return reply.status(400).send({ statusCode: 400, message: 'Could not read the uploaded file.' })
      }
      fileMimetype = part.mimetype
      fileFilename = part.filename
    } else if (part.type === 'file') {
      await part.toBuffer().catch(() => undefined) // discard extra files
    }
  }

  if (!fileBuffer) {
    return reply.status(400).send({ statusCode: 400, message: 'No file uploaded' })
  }

  const resolvedMime = resolveUploadMimeType(fileMimetype, fileFilename, fileBuffer)
  if (!resolvedMime) {
    return reply.status(400).send({ statusCode: 400, message: 'Only PDF and DOCX files are allowed' })
  }

  const extForKey = resolvedMime === MIME_PDF ? 'pdf' : 'docx'
  const fileName = `${user.id}/${randomUUID()}.${extForKey}`
  let fileUrl: string | null
  try {
    fileUrl = await uploadToS3(fileName, fileBuffer, resolvedMime)
  } catch (err) {
    request.log.error({ err }, 'uploadToS3 failed')
    const detail = formatS3ClientError(err)
    return reply.status(502).send({
      statusCode: 502,
      message: detail || 'Cloud storage upload failed. Check AWS bucket, IAM (s3:PutObject), and AWS_REGION.',
    })
  }

  let content: string
  try {
    content = await extractTextFromFile(fileBuffer, resolvedMime)
  } catch (err) {
    request.log.error({ err }, 'extractTextFromFile failed')
    return reply.status(400).send({
      statusCode: 400,
      message: 'Could not extract text from this file. Try another PDF or DOCX.',
    })
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length

  const rawBase = (fileFilename || '').trim().replace(/\.[^/.]+$/, '').trim()
  const title =
    (titleFromField && titleFromField.trim()) || (rawBase.length > 0 ? rawBase : 'Uploaded document')
  const { rows } = await pool.query(
    `INSERT INTO documents (user_id, title, content, file_url, word_count)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [user.id, title, content, fileUrl, wordCount]
  )

  await pool.query(
    'UPDATE usage_limits SET documents_count = documents_count + 1 WHERE user_id = $1',
    [user.id]
  )

  const uploaded = rows[0] as { id: string; content: string }
  indexDocumentChunks(uploaded.id, content).catch((err) =>
    request.log.error({ err }, 'indexDocumentChunks failed after upload')
  )

  return reply.status(201).send({ data: rows[0] })
}

// ── Append upload to existing document (Pro) — merge text for RAG ──
export async function appendUploadToDocument(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { id } = request.params as { id: string }

  const existing = await pool.query<{ content: string }>(
    'SELECT content FROM documents WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
    [id, user.id]
  )
  if (existing.rows.length === 0) {
    return reply.status(404).send({ statusCode: 404, message: 'Document not found' })
  }

  let fileBuffer: Buffer | undefined
  let fileMimetype = ''
  let fileFilename = ''

  for await (const part of request.parts()) {
    if (part.type === 'file' && !fileBuffer) {
      try {
        fileBuffer = await part.toBuffer()
      } catch (err) {
        request.log.error({ err }, 'append multipart toBuffer failed')
        return reply.status(400).send({ statusCode: 400, message: 'Could not read the uploaded file.' })
      }
      fileMimetype = part.mimetype
      fileFilename = part.filename
    } else if (part.type === 'file') {
      await part.toBuffer().catch(() => undefined)
    }
  }

  if (!fileBuffer) {
    return reply.status(400).send({ statusCode: 400, message: 'No file uploaded' })
  }

  const resolvedMime = resolveUploadMimeType(fileMimetype, fileFilename, fileBuffer)
  if (!resolvedMime) {
    return reply.status(400).send({ statusCode: 400, message: 'Only PDF and DOCX files are allowed' })
  }

  const extForKey = resolvedMime === MIME_PDF ? 'pdf' : 'docx'

  try {
    await uploadToS3(`${user.id}/${randomUUID()}-append.${extForKey}`, fileBuffer, resolvedMime)
  } catch (err) {
    request.log.error({ err }, 'append uploadToS3 failed')
    const detail = formatS3ClientError(err)
    return reply.status(502).send({
      statusCode: 502,
      message: detail || 'Cloud storage upload failed. Check AWS bucket, IAM (s3:PutObject), and AWS_REGION.',
    })
  }

  let extracted: string
  try {
    extracted = await extractTextFromFile(fileBuffer, resolvedMime)
  } catch (err) {
    request.log.error({ err }, 'append extractTextFromFile failed')
    return reply.status(400).send({
      statusCode: 400,
      message: 'Could not extract text from this file. Try another PDF or DOCX.',
    })
  }
  if (!extracted.trim()) {
    return reply.status(400).send({
      statusCode: 400,
      message: 'No text could be extracted from this file.',
    })
  }

  const base = existing.rows[0].content || ''
  const header = `\n\n---\n\n## Added from file: ${fileFilename}\n\n`
  const merged = `${base.trimEnd()}${header}${extracted.trim()}`
  const wordCount = merged.split(/\s+/).filter(Boolean).length

  const { rows } = await pool.query(
    `UPDATE documents SET content = $1, word_count = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [merged, wordCount, id]
  )

  const updated = rows[0] as { id: string; content: string }
  indexDocumentChunks(updated.id, merged).catch((err) =>
    request.log.error({ err }, 'indexDocumentChunks failed after append-upload')
  )

  return reply.send({ data: rows[0] })
}
