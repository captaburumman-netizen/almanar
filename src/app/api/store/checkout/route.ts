/**
 * GET /api/store/checkout?productId=...&locale=en|ar
 *
 * Creates a Stripe Checkout Session for a paid digital product and
 * immediately redirects to the hosted Stripe page.
 * Unauthenticated users are redirected to sign-in first.
 */
import { NextRequest, NextResponse }  from 'next/server'
import { getServerSession }           from 'next-auth'
import { authOptions }                from '@/lib/auth'
import { db }                         from '@/lib/db'
import {
  getStripe,
  getOrCreateStripeCustomer,
  toCents,
  BILLING_CURRENCY,
}                                     from '@/lib/stripe'
import { validateCoupon }             from '@/lib/coupons'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const productId  = searchParams.get('productId')  ?? ''
  const locale     = searchParams.get('locale')     ?? 'ar'
  const couponCode = searchParams.get('couponCode') ?? undefined

  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const loginUrl = new URL(`/${locale}/auth/signin`, req.url)
    loginUrl.searchParams.set('callbackUrl', `/${locale}/store`)
    return NextResponse.redirect(loginUrl)
  }

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  // ── Load product ──────────────────────────────────────────────────────────
  const product = await db.product.findUnique({
    where:  { id: productId, isPublished: true },
    select: {
      id:       true,
      slug:     true,
      titleEn:  true,
      titleAr:  true,
      price:    true,
      isFree:   true,
      category: true,
      s3Key:    true,
    },
  }).catch(() => null)

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }
  if (product.isFree || product.category === 'TOY_AFFILIATE') {
    return NextResponse.json({ error: 'Product cannot be purchased via checkout' }, { status: 400 })
  }
  if (!product.s3Key) {
    return NextResponse.json({ error: 'No file available for this product' }, { status: 400 })
  }

  const basePrice = Number(product.price)

  // ── Check if already purchased ────────────────────────────────────────────
  const existingPurchase = await db.productPurchase.findFirst({
    where: { userId: session.user.id, productId, status: 'COMPLETED' },
  }).catch(() => null)

  if (existingPurchase) {
    // Already owns it — send to dashboard
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url))
  }

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

  // ── Coupon ────────────────────────────────────────────────────────────────
  let price    = basePrice
  let couponId: string | undefined
  let savings  = 0

  if (couponCode) {
    const couponResult = await validateCoupon(couponCode, { originalPrice: basePrice, productId })
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
      userId:   session.user.id,
      productId,
      amount:   price,
      currency: BILLING_CURRENCY,
      status:   'PENDING',
      isFree:   false,
    },
  })

  const title   = locale === 'ar' ? product.titleAr : product.titleEn
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // ── Create Stripe Checkout Session ────────────────────────────────────────
  const checkoutSession = await getStripe().checkout.sessions.create({
    customer:             customerId,
    mode:                 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        quantity:   1,
        price_data: {
          currency:     BILLING_CURRENCY,
          unit_amount:  toCents(price),
          product_data: { name: title },
        },
      },
    ],
    metadata: {
      type:        'product_purchase',
      productId,
      productSlug: product.slug,
      purchaseId:  purchase.id,
      userId:      session.user.id,
      locale,
      ...(couponId ? { couponId, couponSavings: String(savings) } : {}),
    },
    success_url: `${baseUrl}/${locale}/payment/success?type=product&productSlug=${product.slug}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${baseUrl}/${locale}/store/${product.slug}`,
  })

  // Link the Stripe session back to the purchase (best-effort)
  await db.productPurchase.update({
    where: { id: purchase.id },
    data:  { stripeSessionId: checkoutSession.id },
  }).catch(() => { /* webhook uses purchaseId from metadata */ })

  return NextResponse.redirect(checkoutSession.url!)
}
