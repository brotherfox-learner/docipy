import {
  GoogleGenerativeAI,
  TaskType,
  type EmbedContentRequest,
  type GenerationConfig,
  type GenerativeModel,
} from '@google/generative-ai'
import { pool } from '@/db'
import {
  isRateLimitError,
  parseGenerativeModelChain,
  sleep,
  withGeminiRetry,
  withGenerativeModelFallback,
} from '@/utils/geminiRequests'

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY

const MAX_EMBED_CHARS = 8000
const GEMINI_EMBED_DELAY_MS = Math.max(0, Number.parseInt(process.env.GEMINI_EMBED_DELAY_MS || '400', 10) || 0)

/** Must match DB column `vector(768)` in document_chunks.embedding */
const EMBEDDING_OUTPUT_DIM = Math.min(
  3072,
  Math.max(768, Number.parseInt(process.env.GEMINI_EMBEDDING_DIMENSION || '768', 10) || 768)
)

function parseEmbeddingModelChain(): string[] {
  const primary = (process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001').trim()
  const fallbacks = (process.env.GEMINI_EMBEDDING_MODEL_FALLBACKS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return [primary, ...fallbacks]
}

function isEmbeddingModelUnavailable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  if ((err as { status?: number })?.status === 404) return true
  return /404|not found|NOT_FOUND|not supported for embedContent|is not found for API version/i.test(msg)
}

/** Gemini docs: L2-normalize when using reduced output dimensionality (e.g. 768 vs 3072). */
function l2Normalize(values: number[]): number[] {
  const sumSq = values.reduce((s, v) => s + v * v, 0)
  const norm = Math.sqrt(sumSq) || 1
  return values.map((v) => v / norm)
}

function usesConfigurableEmbeddingDim(modelName: string): boolean {
  return /gemini-embedding/i.test(modelName)
}

function buildEmbedRequest(
  trimmed: string,
  modelName: string,
  taskType: TaskType,
  includeTaskType: boolean
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    content: { role: 'user', parts: [{ text: trimmed }] },
  }
  if (includeTaskType) {
    body.taskType = taskType
  }
  if (usesConfigurableEmbeddingDim(modelName)) {
    body.outputDimensionality = EMBEDDING_OUTPUT_DIM
  }
  return body
}

function getGenAI() {
  if (!apiKey) {
    throw new Error('Missing GOOGLE_AI_API_KEY (or GEMINI_API_KEY) in environment')
  }
  return new GoogleGenerativeAI(apiKey)
}

function getChatGenerationConfig(): GenerationConfig {
  const t = Number.parseFloat(process.env.GEMINI_CHAT_TEMPERATURE ?? '0.7')
  const maxOut = Number.parseInt(process.env.GEMINI_CHAT_MAX_OUTPUT_TOKENS ?? '4096', 10) || 4096
  return {
    temperature: Number.isFinite(t) ? Math.min(2, Math.max(0, t)) : 0.7,
    maxOutputTokens: Math.min(8192, Math.max(256, maxOut)),
    topP: 0.95,
  }
}

function generateChat(model: GenerativeModel, promptText: string) {
  return model.generateContent({
    contents: [{ role: 'user', parts: [{ text: promptText }] }],
    generationConfig: getChatGenerationConfig(),
  })
}

/** Runtime helper on `result.response`; types omit `.text()` but SDK adds it. */
function extractAnswerText(response: { text: () => string }): string {
  try {
    return response.text().trim()
  } catch {
    return ''
  }
}

/** Short hint for UI when Gemini / network fails (no secrets). */
function formatGeminiFailure(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  const msg = raw.slice(0, 280)
  const chain = parseGenerativeModelChain().join(' → ')
  if (/404|not found|NOT_FOUND/i.test(msg) && /model/i.test(msg)) {
    return `Gemini model(s) not found or not enabled for this API key. Configured chain: ${chain}. Use exact model IDs from Google AI Studio.`
  }
  if (/400|INVALID_ARGUMENT|API key/i.test(msg)) {
    return 'Gemini rejected the request (invalid API key, quota, or model). Check GOOGLE_AI_API_KEY and Google AI Studio quotas.'
  }
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
    return 'Gemini rate limit or daily quota was exceeded on all models in your chain. Wait 1–2 minutes, add more fallbacks via GEMINI_MODEL_FALLBACKS, or raise limits in Google AI Studio. Background indexing also uses embeddings — set GEMINI_EMBED_DELAY_MS higher if needed.'
  }
  return `Gemini request failed: ${msg}`
}

// ── Embed text ────────────────────────────────────────────────
export async function embedText(
  text: string,
  taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT
): Promise<number[]> {
  const trimmed = text.slice(0, MAX_EMBED_CHARS).trim()
  if (!trimmed) {
    throw new Error('Cannot embed empty text')
  }
  const genAI = getGenAI()
  const chain = parseEmbeddingModelChain()
  let lastErr: unknown

  for (let mi = 0; mi < chain.length; mi++) {
    const modelName = chain[mi]
    const embeddingModel = genAI.getGenerativeModel({ model: modelName })

    try {
      const values = await withGeminiRetry('embedContent', async () => {
        let result
        try {
          result = await embeddingModel.embedContent(
            buildEmbedRequest(trimmed, modelName, taskType, true) as unknown as EmbedContentRequest
          )
        } catch (e) {
          if (isRateLimitError(e)) throw e
          result = await embeddingModel.embedContent(
            buildEmbedRequest(trimmed, modelName, taskType, false) as unknown as EmbedContentRequest
          )
        }

        const raw = result.embedding.values
        if (!raw?.length) {
          throw new Error('Embedding API returned no values')
        }
        return usesConfigurableEmbeddingDim(modelName) ? l2Normalize(raw) : raw
      })
      return values
    } catch (e) {
      lastErr = e
      const hasNext = mi < chain.length - 1
      if (isEmbeddingModelUnavailable(e) && hasNext) {
        console.warn(
          `[RAG] embedding model "${modelName}" unavailable; trying "${chain[mi + 1]}"`
        )
        continue
      }
      throw e
    }
  }

  throw lastErr
}

// ── Chunk document (by words) ───────────────────────────────
export function chunkDocument(content: string, chunkSize = 500): string[] {
  const words = content.trim().split(/\s+/)
  if (words.length === 0 || (words.length === 1 && !words[0])) return []

  const chunks: string[] = []
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ')
    if (chunk.trim()) chunks.push(chunk)
  }
  return chunks
}

// ── Index document chunks ───────────────────────────────────
export async function indexDocumentChunks(documentId: string, content: string): Promise<void> {
  await pool.query('DELETE FROM document_chunks WHERE document_id = $1', [documentId])

  const chunks = chunkDocument(content || '')
  if (chunks.length === 0) return

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0 && GEMINI_EMBED_DELAY_MS > 0) {
      await sleep(GEMINI_EMBED_DELAY_MS)
    }
    const embedding = await embedText(chunks[i], TaskType.RETRIEVAL_DOCUMENT)
    const embeddingStr = `[${embedding.join(',')}]`

    await pool.query(
      `INSERT INTO document_chunks (document_id, chunk_text, embedding, chunk_index)
       VALUES ($1, $2, $3::vector, $4)`,
      [documentId, chunks[i], embeddingStr, i]
    )
  }
}

// ── Similarity search (cosine distance <=>) ─────────────────
export async function findRelevantChunks(
  documentId: string,
  queryEmbedding: number[],
  topK = 5
): Promise<string[]> {
  const embeddingStr = `[${queryEmbedding.join(',')}]`

  const { rows } = await pool.query<{ chunk_text: string }>(
    `SELECT chunk_text
     FROM document_chunks
     WHERE document_id = $2 AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [embeddingStr, documentId, topK]
  )

  return rows.map((r) => r.chunk_text)
}

async function answerFromFullDocumentExcerpt(documentId: string, question: string): Promise<string> {
  let rows: { content: string }[]
  try {
    const res = await pool.query<{ content: string }>(
      `SELECT content FROM documents WHERE id = $1 AND deleted_at IS NULL`,
      [documentId]
    )
    rows = res.rows
  } catch (e) {
    console.error('[RAG] load document content failed:', e)
    return 'Could not load document text from the database. Check the server log for details.'
  }

  if (rows.length === 0) {
    return 'Document was not found or is no longer available.'
  }

  const excerpt = (rows[0].content || '').slice(0, 28000)
  if (!excerpt.trim()) {
    return 'This document has no text to chat about (empty content). Add text, save, or re-upload the file so it can be indexed.'
  }

  let genAI
  try {
    genAI = getGenAI()
  } catch (e) {
    return formatGeminiFailure(e)
  }

  const prompt = `You are a helpful assistant. Answer ONLY using information from the document below. If the answer is not in the document, say you cannot find it in the document.

Document:
"""
${excerpt}
"""

Question: ${question.trim()}

Answer concisely in plain text.`

  try {
    const result = await withGenerativeModelFallback(genAI, (model) =>
      withGeminiRetry('generateContent', () => model.generateContent(prompt))
    )
    const text = extractAnswerText(result.response)
    if (text) return text
    return 'The model did not return a usable answer (it may have been blocked by safety filters). Try rephrasing your question.'
  } catch (e) {
    console.error('[RAG] answerFromFullDocumentExcerpt generateContent:', e)
    return formatGeminiFailure(e)
  }
}

// ── RAG Chat ────────────────────────────────────────────────
export async function ragChat(documentId: string, question: string): Promise<string> {
  const genAI = getGenAI()

  let relevantChunks: string[] = []
  try {
    const queryEmbedding = await embedText(question, TaskType.RETRIEVAL_QUERY)
    relevantChunks = await findRelevantChunks(documentId, queryEmbedding, 5)
  } catch (e) {
    // e.g. no API key, embed failure — fall through to full-document fallback
    console.warn('[RAG] embed/search failed, using full-document fallback:', e)
  }

  if (relevantChunks.length === 0) {
    return answerFromFullDocumentExcerpt(documentId, question)
  }

  const context = relevantChunks.join('\n\n---\n\n')

  const prompt = `
You are a helpful document assistant. Answer the user's question based ONLY on the provided document context.
If the answer is not in the context, say "I don't have enough information in this document to answer that."
Be concise, accurate, and helpful.

Formatting: use Markdown — **bold** for key terms, lists for steps or multiple facts, short paragraphs. No full-answer code fence.

Document Context:
"""
${context.slice(0, 24000)}
"""

User Question: ${question.trim()}

Answer:
`

  try {
    const result = await withGenerativeModelFallback(genAI, (model) =>
      withGeminiRetry('generateContent', () => generateChat(model, prompt))
    )
    const text = extractAnswerText(result.response)
    if (text) return text
  } catch (e) {
    console.warn('[RAG] generateContent failed on retrieved context, trying full-document path:', e)
  }

  return answerFromFullDocumentExcerpt(documentId, question)
}

// ── Chat history ────────────────────────────────────────────
export async function getChatHistory(documentId: string, userId: string) {
  const { rows } = await pool.query(
    `SELECT id, question, answer, created_at
     FROM ai_queries
     WHERE document_id = $1 AND user_id = $2
     ORDER BY created_at ASC`,
    [documentId, userId]
  )
  return rows
}
