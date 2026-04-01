import { FastifyRequest, FastifyReply } from 'fastify'
import { AuthenticatedRequest } from './auth.middleware'

export function planGuard(requiredPlan: 'pro') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as AuthenticatedRequest).user
    if (user.plan?.toLowerCase() !== requiredPlan) {
      return reply.status(403).send({
        statusCode: 403,
        message: 'This feature requires a Pro plan. Please upgrade.',
      })
    }
  }
}
