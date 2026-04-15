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

// ── Generate Summary ──────────────────────────────────────────
export interface SummaryResult {
  summaryText: string
  bulletPoints: string[]
  keyConcepts: string[]
}

export type SummaryLanguage = 'en' | 'th'

export async function generateSummary(
  content: string,
  language: SummaryLanguage = 'en'
): Promise<SummaryResult> {
  const languageInstruction =
    language === 'th'
      ? `LANGUAGE (critical): Write "summaryText", every string in "bulletPoints", and every string in "keyConcepts" in Thai (ภาษาไทย). Use natural, clear Thai suitable for learners. If the source is in another language, convey the ideas faithfully in Thai. JSON property names stay in English.`
      : `LANGUAGE (critical): Write "summaryText", "bulletPoints", and "keyConcepts" in clear English.`

  const prompt = `
You are an expert at summarizing documents for learning purposes.
Analyze the following document and create a comprehensive summary.

${languageInstruction}

Document:
"""
${content.slice(0, 30000)}
"""

Respond ONLY with a valid JSON object (no markdown, no backticks):
{
  "summaryText": "A clear paragraph summary of the key ideas (3-5 sentences)",
  "bulletPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4", "Key point 5"],
  "keyConcepts": ["Concept 1", "Concept 2", "Concept 3"]
}
`

  const result = await generateContentWithChain(prompt)
  const text = result.response.text()
  return parseJsonFromModel<SummaryResult>(text)
}

// ── Generate Quiz ─────────────────────────────────────────────
export interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: string
  questionType: 'multiple_choice' | 'true_false'
}

export type QuizLanguage = 'en' | 'th'

export async function generateQuiz(content: string, language: QuizLanguage = 'en'): Promise<QuizQuestion[]> {
  const languageInstruction =
    language === 'th'
      ? `LANGUAGE (critical): Write every "question", every string in "options", and "correctAnswer" in Thai (ภาษาไทย). Use natural Thai suitable for learners. If the source document is in English or another language, translate the tested ideas into Thai.
For "true_false" questions you MUST use exactly "options": ["จริง", "เท็จ"] and "correctAnswer" must be exactly "จริง" or "เท็จ".
For "multiple_choice" use exactly four Thai options. JSON property names stay in English.`
      : `LANGUAGE (critical): Write every "question", every string in "options", and "correctAnswer" in clear English.
For "true_false" use exactly "options": ["True", "False"] and "correctAnswer" must be exactly "True" or "False".`

  const prompt = `
You are an expert quiz creator for educational content.
Create 5 quiz questions based on the following document.
Mix multiple choice and true/false questions. Make questions that test real understanding, not just memorization.

${languageInstruction}

Document:
"""
${content.slice(0, 20000)}
"""

Respond ONLY with a valid JSON array (no markdown, no backticks):
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "questionType": "multiple_choice"
  },
  {
    "question": "True or false question?",
    "options": ["True", "False"],
    "correctAnswer": "True",
    "questionType": "true_false"
  }
]

Rules:
- Multiple choice: exactly 4 options (in the target language above)
- True/false: options and correctAnswer follow the language rules above
- correctAnswer must be exactly one of the options
- Generate exactly 5 questions
`

  const result = await generateContentWithChain(prompt)
  const text = result.response.text()
  return parseJsonFromModel<QuizQuestion[]>(text)
}

// ── Generate Flashcards ───────────────────────────────────────
export interface Flashcard {
  question: string
  answer: string
}

export type FlashcardLanguage = 'en' | 'th'

export async function generateFlashcards(
  content: string,
  language: FlashcardLanguage = 'en'
): Promise<Flashcard[]> {
  const languageInstruction =
    language === 'th'
      ? `LANGUAGE (critical): Write every "question" and every "answer" in Thai (ภาษาไทย). Use natural, clear Thai suitable for learners. If the source document is in English or another language, translate the ideas into Thai for the cards. JSON property names must stay exactly "question" and "answer" as shown.`
      : `LANGUAGE (critical): Write every "question" and every "answer" in clear English.`

  const prompt = `
You are an expert at creating learning flashcards using active recall principles.
${languageInstruction}
Create 10 flashcards from the following document.
Each flashcard should test one specific concept, term, or idea.
Questions should be clear and concise. Answers should be complete but brief.

Document:
"""
${content.slice(0, 20000)}
"""

Respond ONLY with a valid JSON array (no markdown, no backticks):
[
  {
    "question": "What is [concept]?",
    "answer": "Clear, complete answer in 1-3 sentences."
  }
]

Generate exactly 10 flashcards.
`

  const result = await generateContentWithChain(prompt)
  const text = result.response.text()
  return parseJsonFromModel<Flashcard[]>(text)
}

// ── Generate Knowledge Graph ──────────────────────────────────
export interface GraphNode {
  id: string
  label: string
  /** 1–2 short sentences: what this concept is, grounded in the document */
  description?: string
}

export interface GraphEdge {
  source: string
  target: string
  label: string
}

export interface KnowledgeGraphResult {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export type KnowledgeGraphLanguage = 'en' | 'th'

export async function generateKnowledgeGraph(
  content: string,
  language: KnowledgeGraphLanguage = 'en'
): Promise<KnowledgeGraphResult> {
  const languageBlock =
    language === 'th'
      ? `
LANGUAGE (critical): Write every "label", every "description", and every edge "label" in **Thai** (ภาษาไทย), natural and clear.
Keep JSON keys in English as shown. Node "id" values must stay ASCII identifiers like "node1", "node2" (not Thai).
If the document is in English, translate the concepts into appropriate Thai for the graph text.
`
      : `
LANGUAGE (critical): Write every "label", every "description", and every edge "label" in **English**.
Keep JSON keys in English. Node "id" values must be ASCII like "node1", "node2".
`

  const prompt = `
You are an expert at extracting knowledge graphs from documents.
Extract the key concepts and their relationships from the following document.

Document:
"""
${content.slice(0, 20000)}
"""
${languageBlock}
Respond ONLY with a valid JSON object (no markdown, no backticks):
{
  "nodes": [
    {
      "id": "node1",
      "label": "Main Concept",
      "description": "One or two sentences explaining what this concept means in the context of the document (definition or role)."
    },
    {
      "id": "node2",
      "label": "Related Concept",
      "description": "Brief plain explanation for readers who see only the graph."
    }
  ],
  "edges": [
    { "source": "node1", "target": "node2", "label": "relates to" }
  ]
}

Rules:
- 8-15 nodes maximum
- Focus on the most important concepts
- Every node MUST include "description": 1-2 sentences, plain text, based only on the document (no fluff)
- Edge labels should describe the relationship (e.g., "is a type of", "contains", "leads to", "enables")
- Make node IDs unique strings like "node1", "node2", etc.
`

  const result = await generateContentWithChain(prompt)
  const text = result.response.text()
  return parseJsonFromModel<KnowledgeGraphResult>(text)
}
