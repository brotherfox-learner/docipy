/**
 * Usage (from server/): npx tsx scripts/smoke-pdf-extract.ts <path-to.pdf> [timeoutMs]
 * Sets PDF_TEXT_TIMEOUT_MS before loading file.service (ESM import order).
 */
import { readFileSync, existsSync } from 'node:fs'

const pdfPath = process.argv[2]
const timeoutArg = process.argv[3]
if (!pdfPath) {
  console.error('Usage: npx tsx scripts/smoke-pdf-extract.ts <file.pdf> [timeoutMs]')
  process.exit(1)
}
if (!existsSync(pdfPath)) {
  console.error('File not found:', pdfPath)
  process.exit(1)
}

process.env.PDF_TEXT_TIMEOUT_MS = timeoutArg && /^\d+$/.test(timeoutArg) ? timeoutArg : '8000'

void (async () => {
  const { extractTextFromFile, MIME_PDF } = await import('../src/services/file.service.ts')
  const buf = readFileSync(pdfPath)
  console.log('bytes', buf.length, 'PDF_TEXT_TIMEOUT_MS', process.env.PDF_TEXT_TIMEOUT_MS)
  const t0 = Date.now()
  try {
    const text = await extractTextFromFile(buf, MIME_PDF)
    console.log('OK text length', text.length)
  } catch (e) {
    console.log('ERR', (e as Error).message)
  }
  console.log('elapsed_ms', Date.now() - t0)
})()
