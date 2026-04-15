import { FastifyRequest, FastifyReply } from 'fastify'
import { pool } from '@/db'
import { AuthenticatedRequest } from '@/middlewares/auth.middleware'
import { getStripe, createStripeCustomer, createCheckoutSession } from '@/services/stripe.service'
import Stripe from 'stripe'

/** Stripe API 2025+ exposes billing period on subscription items, not the root object. */
function subscriptionCurrentPeriodEndUnix(sub: Stripe.Subscription): number | null {
  const n = sub.items?.data?.[0]?.current_period_end
  return typeof n === 'number' ? n : null
}

const PERIOD_FALLBACK_SECONDS = 30 * 24 * 60 * 60

async function resolvePeriodEndUnix(subscriptionId: string): Promise<number | null> {
  const stripe = getStripe()
  const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data'] })
  const fromExpanded = subscriptionCurrentPeriodEndUnix(sub as Stripe.Subscription)
  if (fromExpanded != null) return fromExpanded
  const root = (sub as unknown as { current_period_end?: number }).current_period_end
  if (typeof root === 'number' && root > 0) return root
  const { data: itemRows } = await stripe.subscriptionItems.list({ subscription: subscriptionId, limit: 20 })
  for (const row of itemRows) {
    const n = row.current_period_end
    if (typeof n === 'number' && n > 0) return n
  }
  return null
}

async function upgradeUserToPro(params: {
  userId: string
  subscriptionId: string
  stripeCustomerId?: string | null
}) {
  const { userId, subscriptionId, stripeCustomerId } = params
  let endUnix = await resolvePeriodEndUnix(subscriptionId)
  if (endUnix == null) {
    console.warn(
      `[payment] No current_period_end from Stripe for subscription ${subscriptionId}; using 30-day fallback (user ${userId})`
    )
    endUnix = Math.floor(Date.now() / 1000) + PERIOD_FALLBACK_SECONDS
  }
  const periodEnd = new Date(endUnix * 1000).toISOString()

  await pool.query(
    `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, updated_at)
     VALUES ($1, $2, $3, 'pro', 'active', $4::timestamptz, now())
     ON CONFLICT (user_id) DO UPDATE SET
       stripe_subscription_id = EXCLUDED.stripe_subscription_id,
       plan = 'pro',
       status = 'active',
       current_period_end = EXCLUDED.current_period_end,
       stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
       updated_at = now()`,
    [userId, stripeCustomerId ?? null, subscriptionId, periodEnd]
  )

  await pool.query(`UPDATE users SET plan = 'pro' WHERE id = $1`, [userId])
}

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
  const row = rows[0] as Record<string, unknown> | undefined
  if (!row || !process.env.STRIPE_SECRET_KEY) {
    return reply.send({ data: row ?? null })
  }

  const subId = row.stripe_subscription_id as string | null | undefined
  if (!subId || typeof subId !== 'string') {
    return reply.send({ data: row })
  }

  try {
    const sub = await getStripe().subscriptions.retrieve(subId, { expand: ['items.data'] })
    const endUnix = subscriptionCurrentPeriodEndUnix(sub)
    return reply.send({
      data: {
        ...row,
        cancel_at_period_end: sub.cancel_at_period_end,
        stripe_subscription_status: sub.status,
        ...(endUnix != null
          ? { current_period_end: new Date(endUnix * 1000).toISOString() }
          : {}),
      },
    })
  } catch (err) {
    request.log.warn({ err }, 'Stripe subscription retrieve failed')
    return reply.send({ data: row })
  }
}

export async function cancelSubscriptionAtPeriodEnd(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user

  if (!process.env.STRIPE_SECRET_KEY) {
    return reply.status(503).send({ statusCode: 503, message: 'Stripe is not configured' })
  }

  const { rows } = await pool.query(
    `SELECT stripe_subscription_id, plan, status FROM subscriptions WHERE user_id = $1`,
    [user.id]
  )
  const row = rows[0] as { stripe_subscription_id: string | null; plan: string; status: string } | undefined

  if (!row?.stripe_subscription_id || row.plan !== 'pro') {
    return reply.status(400).send({
      statusCode: 400,
      message: 'No active Pro subscription to cancel.',
    })
  }

  try {
    const updated = await getStripe().subscriptions.update(row.stripe_subscription_id, {
      cancel_at_period_end: true,
      expand: ['items.data'],
    })
    const stripeSub = updated as Stripe.Subscription
    let endUnix = subscriptionCurrentPeriodEndUnix(stripeSub)
    if (endUnix == null) {
      const full = await getStripe().subscriptions.retrieve(row.stripe_subscription_id, {
        expand: ['items.data'],
      })
      endUnix = subscriptionCurrentPeriodEndUnix(full)
    }
    if (endUnix == null) {
      return reply.status(502).send({
        statusCode: 502,
        message: 'Could not read billing period from Stripe.',
      })
    }
    return reply.send({
      data: {
        cancel_at_period_end: stripeSub.cancel_at_period_end,
        current_period_end: new Date(endUnix * 1000).toISOString(),
      },
    })
  } catch (err: unknown) {
    request.log.error({ err }, 'Stripe cancel_at_period_end failed')
    const msg = err instanceof Error ? err.message : 'Could not cancel subscription.'
    return reply.status(502).send({ statusCode: 502, message: msg })
  }
}

/** Call after Stripe redirects to success URL if the webhook did not update the DB (local dev, misconfigured URL, etc.). */
export async function syncSubscriptionAfterCheckout(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user

  if (!process.env.STRIPE_SECRET_KEY) {
    return reply.status(503).send({ statusCode: 503, message: 'Stripe is not configured' })
  }

  const { rows } = await pool.query<{ stripe_customer_id: string | null }>(
    'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1',
    [user.id]
  )
  const stripeCustomerId = rows[0]?.stripe_customer_id ?? null
  if (!stripeCustomerId) {
    return reply.status(400).send({
      statusCode: 400,
      message:
        'No Stripe customer on file yet. If you just paid, wait a few seconds and try again, or contact support.',
    })
  }

  try {
    const stripe = getStripe()
    let sub: Stripe.Subscription | undefined = (
      await stripe.subscriptions.list({ customer: stripeCustomerId, status: 'active', limit: 5 })
    ).data[0]
    if (!sub) {
      sub = (await stripe.subscriptions.list({ customer: stripeCustomerId, status: 'trialing', limit: 5 }))
        .data[0]
    }
    if (!sub) {
      return reply.status(404).send({
        statusCode: 404,
        message: 'No active subscription found in Stripe for this account yet. Try again in a moment.',
      })
    }

    await upgradeUserToPro({
      userId: user.id,
      subscriptionId: sub.id,
      stripeCustomerId,
    })

    return reply.send({ data: { synced: true } })
  } catch (err: unknown) {
    request.log.error({ err }, 'syncSubscriptionAfterCheckout failed')
    const msg = err instanceof Error ? err.message : 'Could not sync subscription.'
    return reply.status(502).send({ statusCode: 502, message: msg })
  }
}

export async function resumeSubscription(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user

  if (!process.env.STRIPE_SECRET_KEY) {
    return reply.status(503).send({ statusCode: 503, message: 'Stripe is not configured' })
  }

  const { rows } = await pool.query(
    `SELECT stripe_subscription_id, plan FROM subscriptions WHERE user_id = $1`,
    [user.id]
  )
  const row = rows[0] as { stripe_subscription_id: string | null; plan: string } | undefined

  if (!row?.stripe_subscription_id || row.plan !== 'pro') {
    return reply.status(400).send({
      statusCode: 400,
      message: 'No Pro subscription to resume.',
    })
  }

  try {
    const updated = await getStripe().subscriptions.update(row.stripe_subscription_id, {
      cancel_at_period_end: false,
      expand: ['items.data'],
    })
    const stripeSub = updated as Stripe.Subscription
    let endUnix = subscriptionCurrentPeriodEndUnix(stripeSub)
    if (endUnix == null) {
      const full = await getStripe().subscriptions.retrieve(row.stripe_subscription_id, {
        expand: ['items.data'],
      })
      endUnix = subscriptionCurrentPeriodEndUnix(full)
    }
    if (endUnix == null) {
      return reply.status(502).send({
        statusCode: 502,
        message: 'Could not read billing period from Stripe.',
      })
    }
    return reply.send({
      data: {
        cancel_at_period_end: stripeSub.cancel_at_period_end,
        current_period_end: new Date(endUnix * 1000).toISOString(),
      },
    })
  } catch (err: unknown) {
    request.log.error({ err }, 'Stripe resume subscription failed')
    const msg = err instanceof Error ? err.message : 'Could not resume subscription.'
    return reply.status(502).send({ statusCode: 502, message: msg })
  }
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
    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.userId
      if (
        userId &&
        (subscription.status === 'active' || subscription.status === 'trialing')
      ) {
        const customerRef = subscription.customer
        const customerId =
          typeof customerRef === 'string' ? customerRef : customerRef?.id ?? null
        await upgradeUserToPro({
          userId,
          subscriptionId: subscription.id,
          stripeCustomerId: customerId,
        })
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
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      await syncSubscriptionPeriodFromStripe(subscription)
      const userId = subscription.metadata?.userId
      if (
        userId &&
        (subscription.status === 'active' || subscription.status === 'trialing')
      ) {
        const customerRef = subscription.customer
        const customerId =
          typeof customerRef === 'string' ? customerRef : customerRef?.id ?? null
        await upgradeUserToPro({
          userId,
          subscriptionId: subscription.id,
          stripeCustomerId: customerId,
        })
      }
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
  const userId = session.metadata?.userId || session.client_reference_id || undefined
  if (!userId) {
    console.warn('[payment] checkout.session.completed: missing userId (metadata + client_reference_id empty)')
    return
  }

  const subRef = session.subscription
  const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id
  if (!subscriptionId) {
    console.warn('[payment] checkout.session.completed: missing subscription on session')
    return
  }

  const customerRef = session.customer
  const stripeCustomerId = typeof customerRef === 'string' ? customerRef : customerRef?.id ?? null

  await upgradeUserToPro({ userId, subscriptionId, stripeCustomerId })
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

async function syncSubscriptionPeriodFromStripe(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id
  const endUnix = subscriptionCurrentPeriodEndUnix(subscription)
  if (endUnix == null) return
  const periodEnd = new Date(endUnix * 1000).toISOString()

  await pool.query(
    `UPDATE subscriptions SET current_period_end = $1, updated_at = now() WHERE stripe_subscription_id = $2`,
    [periodEnd, subscriptionId]
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
