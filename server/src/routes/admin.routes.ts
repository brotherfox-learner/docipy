import { FastifyInstance } from 'fastify'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { adminGuard } from '@/middlewares/admin.middleware'
import * as ctrl from '@/controllers/admin.controller'

const adminPreHandlers = [authMiddleware, adminGuard]

export async function adminRoutes(app: FastifyInstance) {
  app.get('/users', { preHandler: adminPreHandlers }, ctrl.listUsers)
  app.get('/users/:id', { preHandler: adminPreHandlers }, ctrl.getUserById)
  app.patch('/users/:id/ban', { preHandler: adminPreHandlers }, ctrl.banUser)
  app.get('/stats', { preHandler: adminPreHandlers }, ctrl.getStats)
}
