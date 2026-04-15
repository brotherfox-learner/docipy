import { FastifyInstance } from 'fastify'
import { authMiddleware } from '@/middlewares/auth.middleware'
import * as ctrl from '@/controllers/payment.controller'

export async function paymentRoutes(app: FastifyInstance) {
  app.post(
    '/webhook',
    {
      config: { rawBody: true },
    },
    ctrl.handleWebhook
  )

  app.post('/checkout', { preHandler: [authMiddleware] }, ctrl.createCheckout)
  app.get('/subscription', { preHandler: [authMiddleware] }, ctrl.getSubscription)
  app.post(
    '/subscription/sync',
    { preHandler: [authMiddleware] },
    ctrl.syncSubscriptionAfterCheckout
  )
  app.post(
    '/subscription/cancel',
    { preHandler: [authMiddleware] },
    ctrl.cancelSubscriptionAtPeriodEnd
  )
  app.post('/subscription/resume', { preHandler: [authMiddleware] }, ctrl.resumeSubscription)
}
