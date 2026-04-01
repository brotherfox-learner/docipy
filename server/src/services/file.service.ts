import { existsSync } from 'fs'
import { join } from 'path'
import { Worker } from 'worker_threads'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import mammoth from 'mammoth'
import { normalizeExtractedDocumentText } from '../utils/documentTextNormalize'

function pdfWorkerScriptPath(): string {
  const p = join(process.cwd(), 'workers', 'pdfExtract.worker.cjs')
  if (!existsSync(p)) {
    throw new Error('workers/pdfExtract.worker.cjs missing (required for PDF text extraction)')
  }
  return p
}

function pdfTextTimeoutMs(): number {
  const n = Number(process.env.PDF_TEXT_TIMEOUT_MS)
  if (Number.isFinite(n) && n >= 5000) return Math.floor(n)
  return 60_000
}

type PdfWorkerMessage = { ok: true; text: string } | { ok: false; error: string }

/**
 * Runs pdf-parse (legacy) in a worker thread so we can terminate on timeout.
 * Some PDFs hang pdf.js in-process; Promise.race on the main thread does not stop that work.
 */
async function extractPdfTextWithWorker(buffer: Buffer, timeoutMs: number): Promise<string> {
  const scriptPath = pdfWorkerScriptPath()
  return new Promise((resolve, reject) => {
    let settled = false
    const worker = new Worker(scriptPath, { workerData: buffer })

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      // Reject immediately — do not await terminate(); on some platforms a stuck pdf.js
      // loop can delay or block worker.terminate(), which would leave the upload hanging.
      reject(
        new Error(
          `PDF text extraction timed out after ${timeoutMs}ms. The file may be damaged, unusually complex, or image-only.`
        )
      )
      void worker.terminate().catch(() => undefined)
    }, timeoutMs)

    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn()
    }

    worker.on('message', (msg: PdfWorkerMessage) => {
      void worker.terminate().catch(() => undefined)
      finish(() => {
        if (msg.ok) resolve(msg.text ?? '')
        else reject(new Error(msg.error || 'PDF text extraction failed'))
      })
    })

    worker.on('error', (err) => {
      void worker.terminate().catch(() => undefined)
      finish(() => reject(err))
    })

    worker.on('exit', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new Error(`PDF worker stopped unexpectedly (code ${code})`))
    })
  })
}

function s3Region(): string {
  return process.env.AWS_REGION?.trim() || 'ap-southeast-1'
}

function s3Bucket(): string {
  return process.env.AWS_S3_BUCKET?.trim() || 'ai-doc-storage'
}

/**
 * Optional origin for URLs stored in DB (must match where objects actually live).
 * Use when the browser-visible host differs from `https://<bucket>.s3.<region>.amazonaws.com`,
 * e.g. CloudFront: `https://dxxxxx.cloudfront.net`, or you must match the exact bucket name from S3.
 * No trailing slash.
 */
function s3PublicBaseUrl(): string | null {
  const raw = process.env.AWS_S3_PUBLIC_BASE_URL?.trim()
  if (!raw) return null
  return raw.replace(/\/+$/, '')
}

/** Lazily built so `AWS_REGION` from .env is always used (avoids stale client if env loaded late). */
let s3Client: S3Client | undefined
let s3ClientCacheKey = ''

function getS3Client(): S3Client {
  const region = s3Region()
  const id = process.env.AWS_ACCESS_KEY_ID?.trim() || ''
  const secret = process.env.AWS_SECRET_ACCESS_KEY?.trim() || ''
  const cacheKey = `${region}:${id}:${secret}`
  if (!s3Client || s3ClientCacheKey !== cacheKey) {
    s3Client = new S3Client({
      region,
      credentials: { accessKeyId: id, secretAccessKey: secret },
      followRegionRedirects: true,
    })
    s3ClientCacheKey = cacheKey
  }
  return s3Client
}

/**
 * Public URL we persist (e.g. users.avatar_url). Key uses `/` between segments; each segment is encoded.
 * Prefer setting AWS_S3_BUCKET to the exact name shown in S3 (see .env.example). Use AWS_S3_PUBLIC_BASE_URL
 * only for CloudFront / custom domain pointing at the same objects.
 */
export function publicS3ObjectUrl(key: string): string {
  const encodedKey = key.split('/').map(encodeURIComponent).join('/')
  const base = s3PublicBaseUrl()
  if (base) {
    return `${base}/${encodedKey}`
  }
  const bucket = s3Bucket()
  const region = s3Region()
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`
}

export const MIME_PDF = 'application/pdf'
export const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function fileExtension(filename: string): string | null {
  const n = filename.trim()
  if (!n) return null
  const i = n.lastIndexOf('.')
  if (i <= 0 || i >= n.length - 1) return null
  return n.slice(i + 1).toLowerCase()
}

/**
 * Resolve PDF/DOCX type: magic bytes (works when MIME is wrong or filename is mangled),
 * then MIME, then extension (last segment only — handles names like "ม.ต้น.pdf").
 */
export function resolveUploadMimeType(
  mimetype: string,
  filename: string,
  buffer?: Buffer
): typeof MIME_PDF | typeof MIME_DOCX | null {
  if (buffer && buffer.length >= 5) {
    const head = buffer.subarray(0, 5).toString('latin1')
    if (head.startsWith('%PDF')) return MIME_PDF
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    ) {
      const ext = fileExtension(filename)
      const m = (mimetype || '').toLowerCase()
      if (
        ext === 'docx' ||
        m.includes('wordprocessingml') ||
        m.includes('msword') ||
        m === 'application/zip' ||
        m === 'application/x-zip-compressed'
      ) {
        return MIME_DOCX
      }
    }
  }

  const m = (mimetype || '').toLowerCase().trim()
  if (m === MIME_PDF || m === 'application/x-pdf') return MIME_PDF
  if (m === MIME_DOCX || m.includes('wordprocessingml')) return MIME_DOCX
  const ext = fileExtension(filename)
  if (ext === 'pdf') return MIME_PDF
  if (ext === 'docx') return MIME_DOCX
  return null
}

export function isS3Configured(): boolean {
  const id = process.env.AWS_ACCESS_KEY_ID?.trim()
  const secret = process.env.AWS_SECRET_ACCESS_KEY?.trim()
  return Boolean(id && secret)
}

/** Readable line for API responses when PutObject fails (IAM, region, bucket name, etc.). */
export function formatS3ClientError(err: unknown): string {
  if (!err || typeof err !== 'object') return ''
  const o = err as { name?: string; message?: string }
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  const msg = typeof o.message === 'string' ? o.message.trim() : ''
  return [name, msg].filter(Boolean).join(': ')
}

/** Returns public object URL, or null if AWS is not configured (text extraction still works). */
export async function uploadToS3(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  if (!isS3Configured()) {
    return null
  }

  const bucket = s3Bucket()
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  )

  return publicS3ObjectUrl(key)
}

export async function getPresignedUrl(key: string): Promise<string> {
  const bucket = s3Bucket()
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  return getSignedUrl(getS3Client(), command, { expiresIn: 3600 }) // 1 hour
}

export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  let raw: string
  if (mimeType === MIME_PDF) {
    const ms = pdfTextTimeoutMs()
    raw = await extractPdfTextWithWorker(buffer, ms)
  } else if (mimeType === MIME_DOCX || mimeType.includes('wordprocessingml')) {
    const result = await mammoth.extractRawText({ buffer })
    raw = result.value
  } else {
    throw new Error('Unsupported file type')
  }

  return normalizeExtractedDocumentText(raw)
}
