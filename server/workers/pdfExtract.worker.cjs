'use strict'

const path = require('path')
const { pathToFileURL } = require('url')
const { parentPort, workerData } = require('worker_threads')
const { PDFParse } = require('pdf-parse')

/**
 * Point pdf.js at bundled Adobe CMaps + standard fonts (required for many Thai / CJK / Identity-H PDFs).
 * Without this, text often decodes as garbage symbols.
 *
 * Optional env (HTTPS, trailing slash):
 *   PDFJS_CMAP_URL=https://unpkg.com/pdfjs-dist@5.4.296/cmaps/
 *   PDFJS_STANDARD_FONT_URL=https://unpkg.com/pdfjs-dist@5.4.296/standard_fonts/
 */
function pdfJsLoadOptions() {
  const envCmap = process.env.PDFJS_CMAP_URL?.trim()
  const envFonts = process.env.PDFJS_STANDARD_FONT_URL?.trim()
  if (envCmap) {
    const cMapUrl = envCmap.endsWith('/') ? envCmap : `${envCmap}/`
    const standardFontDataUrl = envFonts
      ? envFonts.endsWith('/')
        ? envFonts
        : `${envFonts}/`
      : undefined
    return {
      cMapUrl,
      cMapPacked: true,
      ...(standardFontDataUrl ? { standardFontDataUrl } : {}),
      useWorkerFetch: true,
      useSystemFonts: true,
    }
  }

  const pdfRoot = path.dirname(require.resolve('pdfjs-dist/package.json'))
  const cMapUrl = pathToFileURL(path.join(pdfRoot, 'cmaps')).href + '/'
  const standardFontDataUrl = pathToFileURL(path.join(pdfRoot, 'standard_fonts')).href + '/'

  return {
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl,
    /** Node 18+ fetch can read file:// for these assets */
    useWorkerFetch: true,
    useSystemFonts: true,
  }
}

/**
 * Rebuild a single Buffer from whatever structured-clone sends across the thread boundary.
 * (Avoids rare corruption / odd deserialization edge cases with Buffer in workerData.)
 */
function toBuffer(data) {
  if (Buffer.isBuffer(data)) {
    return Buffer.from(data)
  }
  if (data instanceof Uint8Array) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength)
  }
  if (data && data.type === 'Buffer' && Array.isArray(data.data)) {
    return Buffer.from(data.data)
  }
  try {
    return Buffer.from(data)
  } catch {
    return Buffer.alloc(0)
  }
}

void (async () => {
  let parser
  try {
    const buf = toBuffer(workerData)
    if (buf.length < 5) {
      parentPort.postMessage({ ok: false, error: 'Empty or invalid PDF buffer' })
      return
    }
    const head = buf.subarray(0, 5).toString('latin1')
    if (!head.startsWith('%PDF')) {
      parentPort.postMessage({ ok: false, error: 'File does not look like a PDF (missing %PDF header)' })
      return
    }

    parser = new PDFParse({ data: buf, ...pdfJsLoadOptions() })
    const result = await parser.getText()
    const text = result && result.text != null ? String(result.text) : ''
    parentPort.postMessage({ ok: true, text })
  } catch (err) {
    parentPort.postMessage({
      ok: false,
      error: err && err.message ? String(err.message) : String(err),
    })
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      try {
        await parser.destroy()
      } catch {
        /* ignore */
      }
    }
  }
})()
