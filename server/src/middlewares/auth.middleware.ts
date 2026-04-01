import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '@/utils/token'

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string
    email: string
    plan: 'free' | 'pro'
    is_verified: boolean
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ statusCode: 401, message: 'Missing token' })
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyAccessToken(token)

    // Attach user to request
    ;(request as AuthenticatedRequest).user = payload
  } catch (err) {
    return reply.status(401).send({ statusCode: 401, message: 'Invalid or expired token' })
  }
}
