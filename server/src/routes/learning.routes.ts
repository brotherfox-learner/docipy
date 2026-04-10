import { FastifyInstance } from 'fastify'
import { authMiddleware } from '@/middlewares/auth.middleware'
import * as lessonCtrl from '@/controllers/lesson.controller'

export async function learningRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)
  app.get('/dashboard-stats', lessonCtrl.getLearningDashboardStats)
}
