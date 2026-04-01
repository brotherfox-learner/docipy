import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

/** Primary + optional fallbacks when a model returns 429 / quota (comma-separated). */
export function parseGenerativeModelChain(): string[] {
  const primary = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim()
  const fallbacks = (process.env.GEMINI_MODEL_FALLBACKS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return [primary, ...fallbacks]
}

export function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /429|RESOURCE_EXHAUSTED|Too Many Requests|rate limit|quota exceeded/i.test(msg)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const GEMINI_RETRY_MAX = Math.min(8, Math.max(1, Number.parseInt(process.env.GEMINI_RETRY_MAX || '4', 10) || 4))
const GEMINI_RETRY_BASE_MS = Math.max(400, Number.parseInt(process.env.GEMINI_RETRY_BASE_MS || '2000', 10) || 2000)

/** Retries the same call on 429-style errors (exponential backoff). */
export async function withGeminiRetry<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt < GEMINI_RETRY_MAX; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      if (!isRateLimitError(e) || attempt === GEMINI_RETRY_MAX - 1) {
        throw e
      }
      const waitMs = GEMINI_RETRY_BASE_MS * 2 ** attempt
      console.warn(`[Gemini] ${operation} rate limited; retry ${attempt + 1}/${GEMINI_RETRY_MAX} after ${waitMs}ms`)
      await sleep(waitMs)
    }
  }
  throw lastErr
}

/**
 * Tries each generative model in order (GEMINI_MODEL, then GEMINI_MODEL_FALLBACKS).
 * Only advances to the next model when the error looks like rate limit / quota.
 */
export async function withGenerativeModelFallback<T>(
  genAI: GoogleGenerativeAI,
  run: (model: GenerativeModel) => Promise<T>
): Promise<T> {
  const chain = parseGenerativeModelChain()
  if (chain.length === 0) {
    throw new Error('No Gemini generative models configured (GEMINI_MODEL empty)')
  }

  let lastErr: unknown
  for (let i = 0; i < chain.length; i++) {
    const name = chain[i]
    try {
      const model = genAI.getGenerativeModel({ model: name })
      return await run(model)
    } catch (e) {
      lastErr = e
      const hasNext = i < chain.length - 1
      if (isRateLimitError(e) && hasNext) {
        console.warn(`[Gemini] model "${name}" rate limited / quota; trying "${chain[i + 1]}"`)
        continue
      }
      throw e
    }
  }
  throw lastErr
}
