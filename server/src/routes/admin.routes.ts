import { FastifyInstance } from 'fastify'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { adminGuard } from '@/middlewares/admin.middleware'
import * as ctrl from '@/controllers/admin.controller'
import * as analyticsCtrl from '@/controllers/admin-analytics.controller'

const adminPreHandlers = [authMiddleware, adminGuard]

export async function adminRoutes(app: FastifyInstance) {
  app.get('/analytics/overview', { preHandler: adminPreHandlers }, analyticsCtrl.getAnalyticsOverview)
  app.get('/analytics/visualizations', { preHandler: adminPreHandlers }, analyticsCtrl.getAnalyticsVisualizations)
  app.get('/analytics/trends', { preHandler: adminPreHandlers }, analyticsCtrl.getAnalyticsTrends)
  app.get('/analytics/users', { preHandler: adminPreHandlers }, analyticsCtrl.getAnalyticsUsers)
  app.get('/analytics/documents', { preHandler: adminPreHandlers }, analyticsCtrl.getAnalyticsDocuments)
  app.get('/analytics/business', { preHandler: adminPreHandlers }, analyticsCtrl.getAnalyticsBusiness)
  app.get('/analytics/features', { preHandler: adminPreHandlers }, analyticsCtrl.getAnalyticsFeatures)

  app.get('/users', { preHandler: adminPreHandlers }, ctrl.listUsers)
  app.get('/users/:id', { preHandler: adminPreHandlers }, ctrl.getUserById)
  app.patch('/users/:id/ban', { preHandler: adminPreHandlers }, ctrl.banUser)
  app.get('/stats', { preHandler: adminPreHandlers }, ctrl.getStats)
}
