import { Communicate } from 'edge-tts-universal'

const EDGE_VOICES = {
  en: 'en-US-AriaNeural',
  th: 'th-TH-PremwadeeNeural',
} as const

const MAX_CHARS = 10_000
const CONNECTION_MS = 60_000

/** Avoid breaking SSML if lesson text contains markup characters. */
function sanitizeForEdgeTts(text: string): string {
  return text.replace(/[<>&]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Synthesize speech via Microsoft Edge online TTS (same service as Edge Read aloud).
 * Returns MP3 bytes (mono, ~24 kHz per Edge defaults).
 */
export async function synthesizeEdgeMp3(text: string, language: 'en' | 'th'): Promise<Buffer> {
  const cleaned = sanitizeForEdgeTts(text)
  if (!cleaned) {
    throw new Error('Text is empty after cleaning.')
  }

  const slice = cleaned.length > MAX_CHARS ? `${cleaned.slice(0, MAX_CHARS)}…` : cleaned
  const communicate = new Communicate(slice, {
    voice: EDGE_VOICES[language],
    connectionTimeout: CONNECTION_MS,
  })

  const chunks: Buffer[] = []
  for await (const chunk of communicate.stream()) {
    if (chunk.type === 'audio' && chunk.data) {
      chunks.push(chunk.data)
    }
  }

  if (chunks.length === 0) {
    throw new Error('No audio was returned from the speech service.')
  }

  return Buffer.concat(chunks)
}
