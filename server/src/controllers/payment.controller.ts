import { FastifyRequest, FastifyReply } from 'fastify'
import { pool } from '@/db'
import { AuthenticatedRequest } from '@/middlewares/auth.middleware'
import { getStripe, createStripeCustomer, createCheckoutSession } from '@/services/stripe.service'
import Stripe from 'stripe'

function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent
  if (parent?.type === 'subscription_details' && parent.subscription_details) {
    const s = parent.subscription_details.subscription
    if (typeof s === 'string') return s
    if (s && typeof s === 'object' && 'id' in s) return s.id
  }
  for (const line of invoice.lines?.data ?? []) {
    const s = line.subscription
    if (typeof s === 'string') return s
    if (s && typeof s === 'object' && 'id' in s) return s.id
  }
  return null
}

export async function createCheckout(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user

  if (!process.env.STRIPE_SECRET_KEY) {
    return reply.status(503).send({ message: 'Stripe is not configured' })
  }

  const existing = await pool.query(
    `SELECT plan, status, stripe_subscription_id, stripe_customer_id
     FROM subscriptions WHERE user_id = $1`,
    [user.id]
  )
  const subRow = existing.rows[0]
  if (
    subRow?.plan === 'pro' &&
    subRow?.status === 'active' &&
    subRow?.stripe_subscription_id
  ) {
    return reply.status(400).send({ message: 'You already have an active Pro subscription.' })
  }

  let customerId = subRow?.stripe_customer_id as string | undefined

  if (!customerId) {
    const userRow = await pool.query('SELECT email, name FROM users WHERE id = $1', [user.id])
    const u = userRow.rows[0]
    if (!u) {
      return reply.status(404).send({ message: 'User not found' })
    }
    customerId = await createStripeCustomer(u.email, u.name)

    await pool.query(
      `INSERT INTO subscriptions (user_id, stripe_customer_id, plan, status)
       VALUES ($1, $2, 'free', 'active')
       ON CONFLICT (user_id) DO UPDATE SET
         stripe_customer_id = EXCLUDED.stripe_customer_id,
         updated_at = now()`,
      [user.id, customerId]
    )
  }

  const checkoutUrl = await createCheckoutSession(customerId, user.id)
  return reply.send({ data: { url: checkoutUrl } })
}

export async function getSubscription(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const { rows } = await pool.query('SELECT * FROM subscriptions WHERE user_id = $1', [user.id])
  return reply.send({ data: rows[0] ?? null })
}

export async function handleWebhook(request: FastifyRequest, reply: FastifyReply) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return reply.status(503).send({ message: 'Stripe is not configured' })
  }

  const sigHeader = request.headers['stripe-signature']
  const sig = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return reply.status(503).send({ message: 'Webhook secret not configured' })
  }

  const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    return reply.status(400).send({ message: 'Missing raw body for webhook verification' })
  }

  if (!sig) {
    return reply.status(400).send({ message: 'Missing Stripe-Signature header' })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Verification failed'
    return reply.status(400).send({ message: `Webhook Error: ${msg}` })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'subscription') {
        await activateProPlan(session)
      }
      break
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      await renewSubscription(invoice)
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await handlePaymentFailed(invoice)
      break
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await downgradeToFree(subscription)
      break
    }
    default:
      break
  }

  return reply.send({ received: true })
}

async function activateProPlan(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  if (!userId) return

  const subRef = session.subscription
  const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id
  if (!subscriptionId) return

  const stripeSub = await getStripe().subscriptions.retrieve(subscriptionId, {
    expand: ['items.data'],
  })
  const endUnix = stripeSub.items?.data?.[0]?.current_period_end
  if (endUnix == null) return
  const periodEnd = new Date(endUnix * 1000).toISOString()

  await pool.query(
    `UPDATE subscriptions
     SET stripe_subscription_id = $1, plan = 'pro', status = 'active', current_period_end = $2, updated_at = now()
     WHERE user_id = $3`,
    [subscriptionId, periodEnd, userId]
  )

  await pool.query("UPDATE users SET plan = 'pro' WHERE id = $1", [userId])
}

async function renewSubscription(invoice: Stripe.Invoice) {
  const subscriptionId = subscriptionIdFromInvoice(invoice)
  if (!subscriptionId) return

  const periodEnd = new Date(invoice.period_end * 1000).toISOString()

  await pool.query(
    `UPDATE subscriptions SET status = 'active', current_period_end = $1, updated_at = now()
     WHERE stripe_subscription_id = $2`,
    [periodEnd, subscriptionId]
  )
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = subscriptionIdFromInvoice(invoice)
  if (!subscriptionId) return

  await pool.query(
    "UPDATE subscriptions SET status = 'past_due', updated_at = now() WHERE stripe_subscription_id = $1",
    [subscriptionId]
  )
}

async function downgradeToFree(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id
  const { rows } = await pool.query(
    'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1',
    [subscriptionId]
  )
  if (rows.length === 0) return

  const userId = rows[0].user_id as string

  await pool.query(
    `UPDATE subscriptions
     SET plan = 'free', status = 'canceled', stripe_subscription_id = NULL, updated_at = now()
     WHERE user_id = $1`,
    [userId]
  )

  await pool.query("UPDATE users SET plan = 'free' WHERE id = $1", [userId])
}
