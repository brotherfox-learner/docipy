import { FastifyRequest, FastifyReply } from 'fastify'
import { AuthenticatedRequest } from '@/middlewares/auth.middleware'
import { parseAdminEmails, isAdminEmail } from '@/utils/adminEmails'

export async function adminGuard(request: FastifyRequest, reply: FastifyReply) {
  if (reply.sent) return

  const user = (request as AuthenticatedRequest).user
  if (!user?.email) {
    return reply.status(401).send({ statusCode: 401, message: 'Unauthorized' })
  }

  if (parseAdminEmails().length === 0) {
    return reply.status(403).send({
      statusCode: 403,
      message: 'Admin access is not configured (set ADMIN_EMAILS).',
    })
  }

  if (!isAdminEmail(user.email)) {
    return reply.status(403).send({ statusCode: 403, message: 'Admin access required' })
  }
}
