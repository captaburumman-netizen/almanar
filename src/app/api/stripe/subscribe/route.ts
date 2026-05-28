/**
 * GET /api/stripe/subscribe?planId=...&interval=monthly|annual&locale=en|ar
 *
 * Creates a Stripe Checkout Session for a membership subscription
 * and immediately redirects to the hosted Stripe page.
 * Unauthenticated users are redirected to sign-in first.
 */
import { NextRequest, NextResponse }  from 'next/server'
import { getServerSession }           from 'next-auth'
import { authOptions }                from '@/lib/auth'
import { db }                         from '@/lib/db'
import { getStripe, getOrCreateStripeCustomer } from '@/lib/stripe'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const planId   = searchParams.get('planId')   ?? ''
  const interval = searchParams.get('interval') ?? 'monthly'
  const locale   = searchParams.get('locale')   ?? 'ar'

  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const loginUrl = new URL(`/${locale}/auth/signin`, req.url)
    loginUrl.searchParams.set('callbackUrl', `/${locale}/pricing`)
    return NextResponse.redirect(loginUrl)
  }

  // ── Validate plan ─────────────────────────────────────────────────────────
  if (!planId) {
    return NextResponse.json({ error: 'planId is required' }, { status: 400 })
  }

  const plan = await db.membershipPlan.findUnique({
    where:  { id: planId, isActive: true },
    select: { id: true, stripePriceIdMonthly: true, stripePriceIdAnnual: true },
  }).catch(() => null)

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  const priceId = interval === 'annual'
    ? plan.stripePriceIdAnnual
    : plan.stripePriceIdMonthly

  // ── Stripe customer ───────────────────────────────────────────────────────
  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { stripeCustomerId: true, email: true, name: true },
  })
  if (!user?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const customerId = await getOrCreateStripeCustomer(
    session.user.id,
    user.email,
    user.name,
    user.stripeCustomerId,
  )

  if (!user.stripeCustomerId) {
    await db.user.update({
      where: { id: session.user.id },
      data:  { stripeCustomerId: customerId },
    })
  }

  // ── Create Stripe Checkout Session ────────────────────────────────────────
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const checkoutSession = await getStripe().checkout.sessions.create({
    customer:             customerId,
    mode:                 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: {
        almanarUserId: session.user.id,
        planId,
        interval,
      },
    },
    metadata: {
      type:   'subscription',
      planId,
      userId: session.user.id,
      interval,
      locale,
    },
    success_url: `${baseUrl}/${locale}/payment/success?type=subscription`,
    cancel_url:  `${baseUrl}/${locale}/pricing`,
  })

  return NextResponse.redirect(checkoutSession.url!)
}
