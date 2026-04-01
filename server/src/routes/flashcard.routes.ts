import { FastifyInstance } from 'fastify'
import { authMiddleware } from '@/middlewares/auth.middleware'
import * as ctrl from '@/controllers/flashcard.controller'

export async function flashcardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)
  app.patch('/:id/mastered', ctrl.updateMastered)
}
