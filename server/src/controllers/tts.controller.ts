import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { synthesizeEdgeMp3 } from '@/services/tts.service'

const synthesizeSchema = z.object({
  text: z.string().min(1).max(10_000),
  language: z.enum(['en', 'th']).optional().default('en'),
})

export async function postTtsSynthesize(request: FastifyRequest, reply: FastifyReply) {
  const parsed = synthesizeSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? 'Invalid input',
    })
  }

  try {
    const buffer = await synthesizeEdgeMp3(parsed.data.text, parsed.data.language)
    reply.header('Content-Type', 'audio/mpeg')
    reply.header('Content-Length', String(buffer.length))
    reply.header('Cache-Control', 'private, no-store')
    return reply.send(buffer)
  } catch (err) {
    request.log.warn({ err }, 'synthesizeEdgeMp3 failed')
    const message =
      err instanceof Error ? err.message : 'Speech synthesis failed. Try again in a moment.'
    return reply.status(502).send({ statusCode: 502, message })
  }
}
