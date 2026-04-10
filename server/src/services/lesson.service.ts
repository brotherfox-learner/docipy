import { GoogleGenerativeAI } from '@google/generative-ai'
import { withGenerativeModelFallback, withGeminiRetry } from '@/utils/geminiRequests'

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY

function getGenAI() {
  if (!apiKey) {
    throw new Error('Missing GOOGLE_AI_API_KEY (or GEMINI_API_KEY) in environment')
  }
  return new GoogleGenerativeAI(apiKey)
}

async function generateContentWithChain(prompt: string) {
  const genAI = getGenAI()
  return withGenerativeModelFallback(genAI, (model) =>
    withGeminiRetry('generateContent', () => model.generateContent(prompt))
  )
}

function parseJsonFromModel<T>(text: string): T {
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
  cleaned = cleaned.trim()
  return JSON.parse(cleaned) as T
}

export type LessonNodeType = 'text' | 'chart' | 'image' | 'quiz' | 'flashcard' | 'summary'

export interface LearningPathOutlineItem {
  title: string
  nodeType: LessonNodeType
}

export interface LearningPathOutlineResult {
  pathTitle: string
  pathDescription: string
  outline: LearningPathOutlineItem[]
}

export interface LessonNodeGenerated {
  title: string
  nodeType: LessonNodeType
  content: Record<string, unknown>
}

const NODE_TYPES: LessonNodeType[] = ['text', 'chart', 'image', 'quiz', 'flashcard', 'summary']

function normalizeNodeType(raw: string): LessonNodeType | null {
  const s = String(raw || '').toLowerCase().trim()
  if (NODE_TYPES.includes(s as LessonNodeType)) return s as LessonNodeType
  return null
}

function languageBlock(lang: 'en' | 'th'): string {
  return lang === 'th'
    ? `LANGUAGE (critical): All learner-facing strings (titles, body text, options, explanations, captions, labels) MUST be in natural Thai. JSON keys stay in English as specified.`
    : `LANGUAGE (critical): All learner-facing strings MUST be in clear English. JSON keys stay in English.`
}

/** Pass 1: high-level ordered outline (types + titles only). */
export async function generateLearningPathOutline(
  documentExcerpt: string,
  language: 'en' | 'th'
): Promise<LearningPathOutlineResult> {
  const prompt = `
You design structured learning paths from documents. Create an ordered lesson outline from foundational to advanced.

${languageBlock(language)}

Document (excerpt):
"""
${documentExcerpt.slice(0, 22000)}
"""

Rules:
- Produce between 8 and 12 steps in "outline".
- Mix node types: use several "text", at least one "chart" (quantitative or categorical breakdown), at least one "image" (teach one idea clearly: description + key takeaways + self-check — no image URLs), at least two "quiz", at least one "flashcard", and end with exactly one "summary" as the last item.
- After every 2–3 teaching nodes (text/chart/image), insert a "quiz" or "flashcard" checkpoint.
- Titles must be short (max ~80 chars).

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "pathTitle": "Short course title from the document theme",
  "pathDescription": "One sentence what the learner will gain",
  "outline": [
    { "title": "Lesson step title", "nodeType": "text" }
  ]
}

Allowed "nodeType" values only: "text", "chart", "image", "quiz", "flashcard", "summary".
`

  const result = await generateContentWithChain(prompt)
  const text = result.response.text()
  const parsed = parseJsonFromModel<LearningPathOutlineResult>(text)
  if (!parsed.outline?.length) {
    throw new Error('Learning path outline was empty')
  }
  const outline = parsed.outline
    .map((o) => {
      const raw = o as { title?: string; nodeType?: string; node_type?: string }
      const nt = raw.nodeType ?? raw.node_type
      return {
        title: String(raw.title || '').slice(0, 500),
        nodeType: normalizeNodeType(String(nt)) || 'text',
      }
    })
    .filter((o) => o.title.length > 0)

  if (outline.length < 6) {
    throw new Error('Learning path outline too short')
  }

  const last = outline[outline.length - 1]
  if (last && last.nodeType !== 'summary') {
    outline.push({
      title: language === 'th' ? 'สรุปและข้อคิดสำคัญ' : 'Summary and key takeaways',
      nodeType: 'summary',
    })
  }

  return {
    pathTitle: String(parsed.pathTitle || 'Learning path').slice(0, 500),
    pathDescription: String(parsed.pathDescription || '').slice(0, 2000),
    outline: outline.slice(0, 15),
  }
}

interface Pass2Node {
  title: string
  node_type: string
  content: Record<string, unknown>
}

/** Pass 2: full node payloads matching the outline order and length. */
export async function generateLearningPathNodes(
  documentExcerpt: string,
  language: 'en' | 'th',
  outline: LearningPathOutlineItem[]
): Promise<LessonNodeGenerated[]> {
  const outlineJson = JSON.stringify(
    outline.map((o, i) => ({ order: i, title: o.title, nodeType: o.nodeType })),
    null,
    0
  )

  const prompt = `
You expand a lesson outline into full lesson nodes for an app. Ground every fact in the document; do not invent sources.

${languageBlock(language)}

Document (excerpt):
"""
${documentExcerpt.slice(0, 22000)}
"""

Follow this outline EXACTLY — same number of nodes, same order, same node_type per index:
${outlineJson}

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "nodes": [
    {
      "title": "string (can refine outline title slightly)",
      "node_type": "text|chart|image|quiz|flashcard|summary",
      "content": { }
    }
  ]
}

Content shapes by node_type:
- text: { "body": "Markdown lesson (2-6 short paragraphs)", "key_points": ["3-5 bullet strings"] }
- chart: { "chart_type": "bar"|"pie"|"line"|"area", "title": "short", "description": "1-2 sentences", "series": [ { "label": "string", "value": number } ] } with 3-8 series points, values plausible from the document; prefer "bar" for category comparison, "line" or "area" for ordered progression, "pie" for parts-of-whole
- image: { "caption": "string", "alt": "string", "description": "2-3 sentences explaining the concept clearly", "key_ideas": [ "2-4 very short bullets the learner should memorize" ], "self_check": "One concrete question the learner answers in their head before continuing (not generic)" } — no image URLs; teach, do not decorate
- quiz: { "questions": [ { "question": "string", "options": ["four strings"], "correct_index": 0-3, "explanation": "string" } ] } with 2-3 questions per quiz node
- flashcard: { "cards": [ { "front": "string", "back": "string" } ] } with 4-6 cards
- summary: { "body": "Markdown recap", "takeaways": ["4-6 strings"] }

Rules:
- "nodes" length MUST equal ${outline.length}.
- For each index i, nodes[i].node_type MUST match outline[i].nodeType from the outline above.
- Multiple choice: exactly 4 options; correct_index 0-3.
`

  const result = await generateContentWithChain(prompt)
  const text = result.response.text()
  const parsed = parseJsonFromModel<{ nodes: Pass2Node[] }>(text)
  const rawNodes = Array.isArray(parsed.nodes) ? parsed.nodes : []

  const out: LessonNodeGenerated[] = []
  for (let i = 0; i < outline.length; i++) {
    const expectedType = outline[i]!.nodeType
    const n = rawNodes[i]
    const nodeType = normalizeNodeType(n?.node_type || '') || expectedType
    const title = String(n?.title || outline[i]!.title).slice(0, 500)
    const content =
      n?.content && typeof n.content === 'object' && !Array.isArray(n.content)
        ? (n.content as Record<string, unknown>)
        : {}
    out.push({ title, nodeType: nodeType === expectedType ? nodeType : expectedType, content })
  }

  return out
}

export async function generateFullLearningPath(
  documentContent: string,
  language: 'en' | 'th'
): Promise<{
  pathTitle: string
  pathDescription: string
  nodes: LessonNodeGenerated[]
}> {
  const excerpt = documentContent.slice(0, 30000)
  const outlineResult = await generateLearningPathOutline(excerpt, language)
  const nodes = await generateLearningPathNodes(excerpt, language, outlineResult.outline)
  return {
    pathTitle: outlineResult.pathTitle,
    pathDescription: outlineResult.pathDescription,
    nodes,
  }
}
