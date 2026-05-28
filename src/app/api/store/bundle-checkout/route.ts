/**
 * GET /api/store/bundle-checkout?bundleId=...&locale=en|ar
 *
 * Creates a Stripe Checkout Session for a bundle purchase and redirects.
 * Unauthenticated users are sent to sign-in first.
 */
import { NextRequest, NextResponse }    from 'next/server'
import { getServerSession }             from 'next-auth'
import { authOptions }                  from '@/lib/auth'
import { db }                           from '@/lib/db'
import {
  getStripe,
  getOrCreateStripeCustomer,
  toCents,
  BILLING_CURRENCY,
}                                       from '@/lib/stripe'
import { validateCoupon }               from '@/lib/coupons'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const bundleId   = searchParams.get('bundleId')   ?? ''
  const locale     = searchParams.get('locale')     ?? 'ar'
  const couponCode = searchParams.get('couponCode') ?? undefined

  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const loginUrl = new URL(`/${locale}/auth/signin`, req.url)
    loginUrl.searchParams.set('callbackUrl', `/${locale}/store`)
    return NextResponse.redirect(loginUrl)
  }
  const userId = session.user.id

  if (!bundleId) {
    return NextResponse.json({ error: 'bundleId is required' }, { status: 400 })
  }

  // ── Load bundle ───────────────────────────────────────────────────────────
  const bundle = await db.bundle.findUnique({
    where:  { id: bundleId, isPublished: true },
    select: {
      id:      true,
      slug:    true,
      titleEn: true,
      titleAr: true,
      price:   true,
      items: {
        select: {
          product: { select: { id: true, s3Key: true } },
        },
      },
    },
  }).catch(() => null)

  if (!bundle) {
    return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
  }
  if (Number(bundle.price) <= 0) {
    return NextResponse.json({ error: 'Bundle must have a price' }, { status: 400 })
  }
  if (bundle.items.length === 0) {
    return NextResponse.json({ error: 'Bundle has no items' }, { status: 400 })
  }

  // ── Check if already purchased ────────────────────────────────────────────
  const existing = await db.productPurchase.findFirst({
    where: { userId, bundleId, status: 'COMPLETED' },
  }).catch(() => null)

  if (existing) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, baseUrl))
  }

  // ── Stripe customer ───────────────────────────────────────────────────────
  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { stripeCustomerId: true, email: true, name: true },
  })
  if (!user?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const customerId = await getOrCreateStripeCustomer(
    userId, user.email, user.name, user.stripeCustomerId,
  )
  if (!user.stripeCustomerId) {
    await db.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } })
  }

  const basePrice = Number(bundle.price)

  // ── Coupon ────────────────────────────────────────────────────────────────
  let price    = basePrice
  let couponId: string | undefined
  let savings  = 0

  if (couponCode) {
    const couponResult = await validateCoupon(couponCode, { originalPrice: basePrice, bundleId })
    if (couponResult.valid && couponResult.finalPrice !== undefined) {
      price    = couponResult.finalPrice
      couponId = couponResult.couponId
      savings  = couponResult.savingsAmount ?? 0
    }
    // Invalid coupon is non-fatal — proceed at full price
  }

  // ── Create pending ProductPurchase ────────────────────────────────────────
  const purchase = await db.productPurchase.create({
    data: {
      userId,
      bundleId,
      amount:   price,
      currency: BILLING_CURRENCY,
      status:   'PENDING',
      isFree:   false,
    },
  })

  const title   = locale === 'ar' ? bundle.titleAr : bundle.titleEn
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // ── Stripe Checkout ───────────────────────────────────────────────────────
  const checkoutSession = await getStripe().checkout.sessions.create({
    customer:             customerId,
    mode:                 'payment',
    payment_method_types: ['card'],
    line_items: [{
      quantity: 1,
      price_data: {
        currency:     BILLING_CURRENCY,
        unit_amount:  toCents(price),
        product_data: { name: title },
      },
    }],
    metadata: {
      type:       'bundle_purchase',
      bundleId,
      bundleSlug: bundle.slug,
      purchaseId: purchase.id,
      userId,
      locale,
      ...(couponId ? { couponId, couponSavings: String(savings) } : {}),
    },
    success_url: `${baseUrl}/${locale}/payment/success?type=bundle&bundleSlug=${bundle.slug}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${baseUrl}/${locale}/store/bundles/${bundle.slug}`,
  })

  await db.productPurchase.update({
    where: { id: purchase.id },
    data:  { stripeSessionId: checkoutSession.id },
  }).catch(() => null)

  return NextResponse.redirect(checkoutSession.url!)
}
