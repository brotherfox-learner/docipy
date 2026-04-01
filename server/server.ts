import 'dotenv/config'
import Fastify, { FastifyError } from 'fastify'
import { setupPlugins } from './src/plugins'
import { authRoutes } from './src/routes/auth.routes'
import { documentRoutes } from './src/routes/document.routes'
import { flashcardRoutes } from './src/routes/flashcard.routes'
import { paymentRoutes } from './src/routes/payment.routes'
import { adminRoutes } from './src/routes/admin.routes'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  },
})

async function start() {
  try {
    // Register Plugins
    await setupPlugins(app)

    // Register Routes
    await app.register(authRoutes, { prefix: '/api/auth' })
    await app.register(documentRoutes, { prefix: '/api/documents' })
    await app.register(flashcardRoutes, { prefix: '/api/flashcards' })
    await app.register(paymentRoutes, { prefix: '/api/payment' })
    await app.register(adminRoutes, { prefix: '/api/admin' })

    // Health Check
    app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

    // Global Error Handler
    app.setErrorHandler((error: FastifyError, request, reply) => {
      const statusCode = error.statusCode || 500
      app.log.error(error)
      let message =
        typeof error.message === 'string' && error.message.trim().length > 0 ? error.message.trim() : ''
      if (!message) {
        const code = (error as NodeJS.ErrnoException).code
        message = code ? `Request failed (${code})` : 'Internal Server Error'
      }
      reply.status(statusCode).send({
        statusCode,
        message,
      })
    })

    // Start
    const PORT = Number(process.env.PORT) || 3001
    await app.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`🚀 Server running on http://localhost:${PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
