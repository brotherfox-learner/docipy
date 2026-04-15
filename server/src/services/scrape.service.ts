import dns from 'node:dns/promises'
import net from 'node:net'
import axios from 'axios'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import { normalizeExtractedDocumentText } from '@/utils/documentTextNormalize'

const MAX_HTML_BYTES = 5 * 1024 * 1024 // 5 MB
const FETCH_TIMEOUT_MS = 15_000

export type ExtractedUrlContent = {
  title: string
  excerpt: string
  content: string
  sourceUrl: string
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((x) => Number(x))
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
    return false
  }
  const [a, b] = parts
  if (a === undefined || b === undefined) return false
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 0) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  return false
}

function isBlockedIPv6(ip: string): boolean {
  const norm = ip.toLowerCase().replace(/^\[|\]$/g, '')
  if (norm === '::1') return true
  // Unique local fc00::/7, link-local fe80::/10
  if (norm.startsWith('fc') || norm.startsWith('fd')) return true
  if (norm.startsWith('fe80:')) return true
  if (norm === '::') return true
  return false
}

function assertNotBlockedIpLiteral(host: string): void {
  const v = net.isIP(host)
  if (v === 4 && isPrivateIPv4(host)) {
    throw new Error('This URL points to a private or local network address and cannot be fetched.')
  }
  if (v === 6 && isBlockedIPv6(host)) {
    throw new Error('This URL points to a private or local network address and cannot be fetched.')
  }
}

/**
 * Block SSRF to internal services: reject obvious local hostnames and
 * resolve hostname to ensure the first resolved address is not private.
 */
export async function assertUrlSafeForServerFetch(urlString: string): Promise<URL> {
  let u: URL
  try {
    u = new URL(urlString)
  } catch {
    throw new Error('Invalid URL.')
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed.')
  }

  const host = u.hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host.endsWith('.localhost') ||
    host === 'metadata.google.internal' ||
    host.endsWith('.internal')
  ) {
    throw new Error('This hostname is not allowed.')
  }

  assertNotBlockedIpLiteral(host)

  if (net.isIP(host) === 0) {
    let address: string
    try {
      const r = await dns.lookup(host, { verbatim: true })
      address = r.address
    } catch {
      throw new Error('Could not resolve the hostname.')
    }
    if (net.isIPv4(address)) {
      if (isPrivateIPv4(address)) {
        throw new Error('This URL resolves to a private or local network address and cannot be fetched.')
      }
    } else if (net.isIPv6(address)) {
      if (isBlockedIPv6(address)) {
        throw new Error('This URL resolves to a private or local network address and cannot be fetched.')
      }
    }
  }

  return u
}

function htmlToPlainText(html: string): string {
  const dom = new JSDOM(html)
  const text = dom.window.document.body?.textContent ?? ''
  return text
}

/**
 * Fetch a public URL, extract main article text with Mozilla Readability (Firefox Reader Mode algorithm).
 */
export async function extractContentFromUrl(urlString: string): Promise<ExtractedUrlContent> {
  const safeUrl = await assertUrlSafeForServerFetch(urlString)
  const finalUrl = safeUrl.href

  const response = await axios.get<ArrayBuffer>(finalUrl, {
    responseType: 'arraybuffer',
    timeout: FETCH_TIMEOUT_MS,
    maxContentLength: MAX_HTML_BYTES,
    maxBodyLength: MAX_HTML_BYTES,
    validateStatus: (s) => s >= 200 && s < 400,
    headers: {
      'User-Agent': 'DocipyDocumentImporter/1.0',
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
    },
  })

  const buf = Buffer.from(response.data as ArrayBuffer)
  if (buf.length > MAX_HTML_BYTES) {
    throw new Error('The page is too large to import (max 5 MB).')
  }

  const contentTypeHeader =
    typeof response.headers['content-type'] === 'string' ? response.headers['content-type'] : ''
  const charset =
    /charset=([^;]+)/i.exec(contentTypeHeader)?.[1]?.trim().replace(/^['"]|['"]$/g, '') || 'utf-8'
  let html: string
  try {
    const decoder = new TextDecoder(charset || 'utf-8', { fatal: false })
    html = decoder.decode(buf)
  } catch {
    html = buf.toString('utf8')
  }

  if (!html.trim()) {
    throw new Error('The server returned an empty response.')
  }

  const dom = new JSDOM(html, { url: finalUrl })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  if (!article || !article.content) {
    throw new Error(
      'Could not extract readable article content from this page. It may be JavaScript-only, paywalled, or lack a clear article body. Try pasting the text manually.'
    )
  }

  const rawText = htmlToPlainText(article.content)
  const content = normalizeExtractedDocumentText(rawText)

  if (!content || content.length < 20) {
    throw new Error(
      'Very little text was extracted. The page may need JavaScript to show content, or the article body could not be detected.'
    )
  }

  const titleFromArticle = (article.title ?? '').trim()
  const excerpt = (article.excerpt ?? '').trim()

  return {
    title: titleFromArticle || safeUrl.hostname || 'Imported page',
    excerpt,
    content,
    sourceUrl: finalUrl,
  }
}
