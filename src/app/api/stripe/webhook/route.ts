/**
 * POST /api/stripe/webhook
 *
 * Stripe webhook receiver. Verifies the HMAC signature then dispatches
 * to the appropriate handler in ./handlers.ts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { headers }                   from 'next/headers'
import type Stripe                   from 'stripe'
import { getStripe }                 from '@/lib/stripe'
import {
  handleCheckoutCompleted,
  handleSubscriptionUpserted,
  handleSubscriptionDeleted,
  handlePaymentFailed,
}                                    from './handlers'

// Opt-in to Node.js runtime so req.text() returns the raw body
// (needed for Stripe signature verification).
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig     = (await headers()).get('stripe-signature') ?? ''
  const secret  = process.env.STRIPE_WEBHOOK_SECRET ?? ''

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionUpserted(event.data.object as Stripe.Subscription, true)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpserted(event.data.object as Stripe.Subscription, false)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        // Silently acknowledge unhandled event types
        break
    }
  } catch (err) {
    console.error(`[stripe/webhook] handler error for ${event.type}:`, err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
