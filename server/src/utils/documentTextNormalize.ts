/**
 * Post-process text from PDF/DOCX extractors. pdf-parse often emits hard line breaks
 * inside paragraphs, hyphenation at column edges, and orphan footnote indices (e.g. "6" then " NIMS...").
 */

const CONNECTOR_END =
  /\b(of|and|the|in|for|to|as|on|or|an?|with|from|by|at|its|their|our|per|via|into|onto|upon|e\.g\.|i\.e\.)\s*$/i

/** Springer-style author superscripts: "1", "3,6" */
const AUTHOR_REF_ONLY = /^\d{1,2}(?:,\d{1,2})*$/

function looksLikeEmailStart(s: string): boolean {
  return /^[a-z0-9._%+-]+@/i.test(s.trim())
}

function endsWithAuthorSuperscriptRef(s: string): boolean {
  return /\d{1,2}(?:,\d{1,2})*\s*$/.test(s.trimEnd())
}

function startsWithMiddleDotContinuation(s: string): boolean {
  return /^\s*[·\u00b7]\s*\S/.test(s)
}

const SECTION_HEADING_BLACKLIST = new Set([
  'introduction',
  'abstract',
  'keywords',
  'conclusion',
  'references',
  'acknowledgements',
  'background',
  'methods',
  'results',
  'discussion',
])

/** Avoid merging section titles + "1"; allow single-token surnames before "3,6" */
function plausibleAuthorNameLine(s: string): boolean {
  const t = s.trim()
  if (!t || t.includes(':') || t.includes('@')) return false
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return true
  if (words.length !== 1) return false
  const w = words[0]!
  if (!/^[A-Za-zÀ-ž\u0E00-\u0E7F-]+$/.test(w)) return false
  if (SECTION_HEADING_BLACKLIST.has(w.toLowerCase())) return false
  return w.length > 12 || (w.length >= 3 && /^[A-ZÀ-Ÿ]/.test(w))
}

/** Footer noise e.g. "1 3" from two-column layout */
function isLoneSuperscriptClusterLine(s: string): boolean {
  return /^\s*\d{1,2}(?:\s+\d{1,2}){1,6}\s*$/.test(s)
}

function mergeBrokenPdfLines(lines: string[]): string[] {
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    let cur = lines[i]
    i += 1

    while (i < lines.length) {
      const nxt = lines[i]
      if (nxt.trim() === '') break

      const a = cur.trimEnd()
      const b = nxt.trimStart()

      if (a.includes('@') || b.includes('@') || looksLikeEmailStart(b)) {
        break
      }

      // Author byline: "Name 1" then " · Other Name" (PDF splits superscripts / separators)
      if (startsWithMiddleDotContinuation(nxt) && endsWithAuthorSuperscriptRef(a)) {
        cur = `${a} ${nxt.trimStart()}`
        i += 1
        continue
      }

      // Author byline: "Muhammad Asadullah" then "1" / "3,6"
      if (plausibleAuthorNameLine(a) && AUTHOR_REF_ONLY.test(nxt.trim())) {
        cur = `${a} ${nxt.trim()}`
        i += 1
        continue
      }

      // Orphan footnote index (e.g. affiliation "6" then " NIMS School..., Country")
      if (
        /^\d{1,2}$/.test(a) &&
        b.length > 0 &&
        (b.length >= 22 || /,/.test(b))
      ) {
        cur = `${a} ${b}`
        i += 1
        continue
      }

      // PDF often keeps a trailing space before a broken word on the next line
      if (/\s$/.test(cur) && b.length > 0) {
        cur = `${a} ${b}`
        i += 1
        continue
      }

      if (CONNECTOR_END.test(a) && /^[A-Za-z0-9]/.test(b)) {
        cur = `${a} ${b}`
        i += 1
        continue
      }

      const endsClause = /[,;:]\s*$/.test(a)
      const endsMidSentence =
        endsClause ||
        /[(\[]\s*$/.test(a) ||
        CONNECTOR_END.test(a) ||
        (a.length >= 50 && /[a-zA-Z]\s*$/.test(a))

      if (a.length > 0 && /^[a-z]/.test(b)) {
        if (!/[.!?:]\s*$/.test(a) && endsMidSentence) {
          cur = `${a} ${b}`
          i += 1
          continue
        }
        if (endsClause) {
          cur = `${a} ${b}`
          i += 1
          continue
        }
      }

      break
    }

    out.push(cur)
  }

  return out
}

export function normalizeExtractedDocumentText(raw: string): string {
  if (!raw) return ''

  let t = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  t = t.replace(/\u00ad/g, '')
  t = t.replace(/\u00a0/g, ' ')

  let prev: string
  do {
    prev = t
    t = t.replace(/([a-zA-Z])-\n\s*([a-zA-Z])/g, '$1$2')
  } while (t !== prev)

  const merged = mergeBrokenPdfLines(t.split('\n')).filter((line) => !isLoneSuperscriptClusterLine(line))

  return merged
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
