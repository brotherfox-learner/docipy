import { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import rawBody from 'fastify-raw-body'

export async function setupPlugins(app: FastifyInstance) {
  await app.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: false,
    runFirst: true,
  })

  await app.register(cors, {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })

  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'cookie-secret-min-32-chars-long!!',
  })

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  })
}
