/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for a one-time course purchase.
 * Body: { courseId: string; locale?: 'en' | 'ar' }
 * Returns: { url: string }
 */
import { NextRequest, NextResponse }       from 'next/server'
import { getServerSession }                from 'next-auth'
import { authOptions }                     from '@/lib/auth'
import { db }                              from '@/lib/db'
import {
  getStripe,
  getOrCreateStripeCustomer,
  toCents,
  BILLING_CURRENCY,
}                                          from '@/lib/stripe'
import { validateCoupon }                  from '@/lib/coupons'

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({})) as {
    courseId?:   string
    locale?:     string
    couponCode?: string
  }
  const { courseId, locale = 'ar', couponCode } = body

  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  // ── Load course ───────────────────────────────────────────────────────────
  const course = await db.course.findUnique({
    where:  { id: courseId, isPublished: true },
    select: {
      id:          true,
      slug:        true,
      titleEn:     true,
      titleAr:     true,
      price:       true,
      isMemberOnly: true,
    },
  }).catch(() => null)

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const basePrice = Number(course.price)

  if (course.isMemberOnly) {
    return NextResponse.json({ error: 'Course requires a membership' }, { status: 400 })
  }
  if (basePrice === 0) {
    return NextResponse.json({ error: 'Course is free — enroll directly' }, { status: 400 })
  }

  // ── Coupon ────────────────────────────────────────────────────────────────
  let price   = basePrice
  let couponId: string | undefined
  let savings  = 0

  if (couponCode) {
    const couponResult = await validateCoupon(couponCode, { originalPrice: basePrice, courseId })
    if (couponResult.valid && couponResult.finalPrice !== undefined) {
      price    = couponResult.finalPrice
      couponId = couponResult.couponId
      savings  = couponResult.savingsAmount ?? 0
    }
    // Invalid coupon is non-fatal — proceed at full price
  }

  // ── Check existing enrollment ─────────────────────────────────────────────
  const existing = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
  }).catch(() => null)

  if (existing) {
    return NextResponse.json({ error: 'Already enrolled in this course' }, { status: 409 })
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

  // ── Create pending purchase record ────────────────────────────────────────
  const purchase = await db.coursePurchase.create({
    data: {
      userId:   session.user.id,
      courseId,
      amount:   price,
      currency: BILLING_CURRENCY,
      status:   'PENDING',
    },
  })

  // ── Create Stripe Checkout Session ────────────────────────────────────────
  const title   = locale === 'ar' ? course.titleAr : course.titleEn
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

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
      type:       'course_purchase',
      courseId,
      courseSlug: course.slug,
      userId:     session.user.id,
      purchaseId: purchase.id,
      locale,
      ...(couponId ? { couponId, couponSavings: String(savings) } : {}),
    },
    success_url: `${baseUrl}/${locale}/payment/success?type=course&courseSlug=${course.slug}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${baseUrl}/${locale}/courses/${course.slug}`,
  })

  // Link the Stripe session back to the purchase record (best-effort)
  await db.coursePurchase.update({
    where: { id: purchase.id },
    data:  { stripeSessionId: checkoutSession.id },
  }).catch(() => { /* non-fatal — webhook uses purchaseId from metadata */ })

  return NextResponse.json({ url: checkoutSession.url })
}
