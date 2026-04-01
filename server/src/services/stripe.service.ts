import Stripe from 'stripe'

const apiVersion = '2026-02-25.clover' as const

let client: Stripe | null = null

export function getStripe(): Stripe {
  if (!client) {
    const secret = process.env.STRIPE_SECRET_KEY
    if (!secret) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    client = new Stripe(secret, { apiVersion })
  }
  return client
}

export async function createStripeCustomer(email: string, name: string): Promise<string> {
  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
  })
  return customer.id
}

export async function createCheckoutSession(customerId: string, userId: string): Promise<string> {
  const stripe = getStripe()
  const priceId = process.env.STRIPE_PRO_PRICE_ID
  if (!priceId) {
    throw new Error('STRIPE_PRO_PRICE_ID is not configured')
  }
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '')

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${clientUrl}/settings?upgraded=true`,
    cancel_url: `${clientUrl}/pricing?canceled=true`,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
    },
  })

  if (!session.url) {
    throw new Error('Stripe Checkout did not return a URL')
  }
  return session.url
}
