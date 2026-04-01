import { FastifyInstance } from 'fastify'
import { authMiddleware } from '@/middlewares/auth.middleware'
import * as ctrl from '@/controllers/auth.controller'

export async function authRoutes(app: FastifyInstance) {
  // Public
  app.post('/register', ctrl.register)
  app.post('/login', ctrl.login)
  app.post('/logout', ctrl.logout)
  app.post('/refresh', ctrl.refresh)
  app.get('/verify-email', ctrl.verifyEmail)
  app.post('/forgot-password', ctrl.forgotPassword)
  app.post('/reset-password', ctrl.resetPassword)

  // OAuth
  app.get('/oauth/google', ctrl.googleOAuthRedirect)
  app.get('/oauth/google/callback', ctrl.googleOAuthCallback)
  app.get('/oauth/github', ctrl.githubOAuthRedirect)
  app.get('/oauth/github/callback', ctrl.githubOAuthCallback)

  // Protected
  app.get('/me', { preHandler: [authMiddleware] }, ctrl.getMe)
  app.patch('/me', { preHandler: [authMiddleware] }, ctrl.patchMe)
  app.post('/me/avatar', { preHandler: [authMiddleware] }, ctrl.uploadAvatar)
  app.post('/change-password', { preHandler: [authMiddleware] }, ctrl.changePasswordLoggedIn)
}
