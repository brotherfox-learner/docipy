import { FastifyInstance } from 'fastify'
import { authMiddleware } from '@/middlewares/auth.middleware'
import * as ctrl from '@/controllers/tts.controller'

export async function ttsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)
  app.post('/synthesize', ctrl.postTtsSynthesize)
}
