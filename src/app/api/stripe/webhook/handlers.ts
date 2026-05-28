/**
 * Stripe webhook event handlers.
 *
 * Extracted from route.ts so they can be unit-tested without violating
 * Next.js's restriction that route files may only export HTTP verb handlers.
 *
 * Email notifications are sent synchronously (awaited) using sendEmail(),
 * which catches all errors internally and never throws.
 */
import * as React                    from 'react'
import type Stripe                   from 'stripe'
import type { SubscriptionStatus }   from '@prisma/client'
import { db }                        from '@/lib/db'
import { sendEmail }                 from '@/lib/resend'
import { createDownloadToken, buildDownloadLink } from '@/lib/downloads'
import { redeemCoupon }                           from '@/lib/coupons'
import { EnrollmentEmail }           from '@/emails/EnrollmentEmail'
import { DownloadEmail }             from '@/emails/DownloadEmail'
import { BundleDownloadEmail }       from '@/emails/BundleDownloadEmail'
import { SubscriptionEmail }         from '@/emails/SubscriptionEmail'
import { SubscriptionCanceledEmail } from '@/emails/SubscriptionCanceledEmail'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ─── Stripe status → Prisma enum ─────────────────────────────────────────────

export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    active:             'ACTIVE',
    canceled:           'CANCELED',
    past_due:           'PAST_DUE',
    trialing:           'TRIALING',
    unpaid:             'UNPAID',
    incomplete:         'INCOMPLETE',
    incomplete_expired: 'CANCELED',
    paused:             'CANCELED',
  }
  return map[status] ?? 'INCOMPLETE'
}

// ─── checkout.session.completed ───────────────────────────────────────────────

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const { metadata } = session
  if (!metadata?.type) return

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null)

  // ── Course purchase ────────────────────────────────────────────────────────
  if (metadata.type === 'course_purchase') {
    const { purchaseId, userId, courseId } = metadata
    if (!purchaseId || !userId || !courseId) return

    await db.$transaction([
      db.coursePurchase.update({
        where: { id: purchaseId },
        data: {
          status:                'COMPLETED',
          stripeSessionId:       session.id,
          stripePaymentIntentId: paymentIntentId,
        },
      }),
      db.enrollment.upsert({
        where:  { userId_courseId: { userId, courseId } },
        create: { userId, courseId, purchaseId, accessType: 'PURCHASE' },
        update: {},
      }),
    ])

    // Send enrollment confirmation email (non-throwing)
    const [userRec, courseRec] = await Promise.all([
      db.user.findUnique({
        where:  { id: userId },
        select: { email: true, name: true, preferredLocale: true },
      }).catch(() => null),
      db.course.findUnique({
        where:  { id: courseId },
        select: { titleEn: true, titleAr: true, slug: true },
      }).catch(() => null),
    ])

    // Record coupon redemption if coupon was applied
    if (metadata.couponId) {
      await redeemCoupon(
        metadata.couponId,
        userId,
        purchaseId,
        'course',
        Number(metadata.couponSavings ?? 0),
      )
    }

    if (userRec?.email && courseRec) {
      const locale      = userRec.preferredLocale ?? metadata.locale ?? 'ar'
      const isAr        = locale === 'ar'
      const courseTitle = isAr ? courseRec.titleAr : courseRec.titleEn
      await sendEmail({
        to:      userRec.email,
        subject: isAr
          ? `تم تسجيلك في: ${courseTitle}`
          : `You're enrolled in: ${courseTitle}`,
        react: React.createElement(EnrollmentEmail, {
          name:        userRec.name ?? '',
          courseTitle,
          courseSlug:  courseRec.slug,
          locale,
          appUrl:      APP_URL,
        }),
      })
    }
  }

  // ── Digital product purchase ───────────────────────────────────────────────
  if (metadata.type === 'product_purchase') {
    const { purchaseId, userId, productId } = metadata
    if (!purchaseId || !userId || !productId) return

    await db.productPurchase.update({
      where: { id: purchaseId },
      data: {
        status:                'COMPLETED',
        stripeSessionId:       session.id,
        stripePaymentIntentId: paymentIntentId,
      },
    })

    // Create download token, then send email with the download link
    const downloadRecord = await createDownloadToken(userId, purchaseId, productId).catch(
      (err) => { console.error('[webhook] createDownloadToken failed:', err); return null }
    )

    const [userRec, productRec] = await Promise.all([
      db.user.findUnique({
        where:  { id: userId },
        select: { email: true, name: true, preferredLocale: true },
      }).catch(() => null),
      db.product.findUnique({
        where:  { id: productId },
        select: { titleEn: true, titleAr: true },
      }).catch(() => null),
    ])

    // Record coupon redemption if coupon was applied
    if (metadata.couponId) {
      await redeemCoupon(
        metadata.couponId,
        userId,
        purchaseId,
        'product',
        Number(metadata.couponSavings ?? 0),
      )
    }

    if (userRec?.email && productRec && downloadRecord) {
      const locale        = userRec.preferredLocale ?? metadata.locale ?? 'ar'
      const isAr          = locale === 'ar'
      const productTitle  = isAr ? productRec.titleAr : productRec.titleEn
      await sendEmail({
        to:      userRec.email,
        subject: isAr ? 'ملفك جاهز للتنزيل' : 'Your download is ready',
        react: React.createElement(DownloadEmail, {
          name:         userRec.name ?? '',
          productTitle,
          downloadUrl:  buildDownloadLink(downloadRecord.token),
          locale,
        }),
      })
    }
  }

  // ── Bundle purchase ───────────────────────────────────────────────────────
  if (metadata.type === 'bundle_purchase') {
    const { purchaseId, userId: bundleUserId, bundleId } = metadata
    if (!purchaseId || !bundleUserId || !bundleId) return

    await db.productPurchase.update({
      where: { id: purchaseId },
      data: {
        status:                'COMPLETED',
        stripeSessionId:       session.id,
        stripePaymentIntentId: paymentIntentId,
      },
    })

    // Load bundle items (only products with an s3Key are downloadable)
    const bundle = await db.bundle.findUnique({
      where:  { id: bundleId },
      select: {
        titleEn:  true,
        titleAr:  true,
        items: {
          select: {
            product: { select: { id: true, titleEn: true, titleAr: true, s3Key: true } },
          },
        },
      },
    }).catch(() => null)

    if (!bundle) return

    // Create one Download token per downloadable product
    const downloadableItems = bundle.items
      .map((item) => item.product)
      .filter((p): p is typeof p & { s3Key: string } => !!p.s3Key)

    for (const product of downloadableItems) {
      await createDownloadToken(bundleUserId, purchaseId, product.id).catch(() => null)
    }

    // Record coupon redemption if coupon was applied
    if (metadata.couponId) {
      await redeemCoupon(
        metadata.couponId,
        bundleUserId,
        purchaseId,
        'bundle',
        Number(metadata.couponSavings ?? 0),
      )
    }

    // Send bundle confirmation email
    const userRec = await db.user.findUnique({
      where:  { id: bundleUserId },
      select: { email: true, name: true, preferredLocale: true },
    }).catch(() => null)

    if (userRec?.email) {
      const locale      = (userRec.preferredLocale ?? metadata.locale ?? 'ar') as 'ar' | 'en'
      const isAr        = locale === 'ar'
      const bundleTitle = isAr ? bundle.titleAr : bundle.titleEn
      const itemTitles  = bundle.items.map((i) =>
        isAr ? i.product.titleAr : i.product.titleEn
      )

      await sendEmail({
        to:      userRec.email,
        subject: isAr
          ? `باقتك "${bundleTitle}" جاهزة للتنزيل`
          : `Your "${bundleTitle}" bundle is ready`,
        react: React.createElement(BundleDownloadEmail, {
          name:        userRec.name ?? (isAr ? 'عزيزي العميل' : 'Customer'),
          bundleTitle,
          items:       itemTitles,
          locale,
          appUrl:      APP_URL,
        }),
      })
    }
  }

  // Persist stripeCustomerId on the user (best-effort, covers all types)
  const userId = metadata.userId
  if (userId && session.customer && typeof session.customer === 'string') {
    await db.user.updateMany({
      where: { id: userId, stripeCustomerId: null },
      data:  { stripeCustomerId: session.customer },
    }).catch(() => { /* non-fatal */ })
  }
}

// ─── customer.subscription.created / updated ─────────────────────────────────

/**
 * @param isNew  Pass `true` when the event is `customer.subscription.created`
 *               so the activation email is sent only once.
 */
export async function handleSubscriptionUpserted(
  sub:   Stripe.Subscription,
  isNew: boolean = false,
): Promise<void> {
  // Resolve the ALMANAR user — prefer metadata, fall back to customer lookup
  let resolvedUserId: string | undefined = sub.metadata?.almanarUserId

  if (!resolvedUserId) {
    const customerId =
      typeof sub.customer === 'string' ? sub.customer : sub.customer.id
    const user = await db.user.findUnique({
      where:  { stripeCustomerId: customerId },
      select: { id: true },
    }).catch(() => null)
    resolvedUserId = user?.id
  }
  if (!resolvedUserId) return

  // Resolve plan from the Stripe price ID
  const priceId = sub.items.data[0]?.price.id
  if (!priceId) return

  const plan = await db.membershipPlan.findFirst({
    where: {
      OR: [
        { stripePriceIdMonthly: priceId },
        { stripePriceIdAnnual:  priceId },
      ],
    },
    select: {
      id:                   true,
      nameEn:               true,
      nameAr:               true,
      stripePriceIdMonthly: true,
      stripePriceIdAnnual:  true,
    },
  }).catch(() => null)
  if (!plan) return

  const interval   = plan.stripePriceIdAnnual === priceId ? 'ANNUAL' : 'MONTHLY'
  const status     = mapStripeStatus(sub.status)
  const customerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  await db.subscription.upsert({
    where:  { stripeSubscriptionId: sub.id },
    create: {
      userId:               resolvedUserId,
      planId:               plan.id,
      stripeSubscriptionId: sub.id,
      stripeCustomerId:     customerId,
      status,
      interval,
      currentPeriodStart:   new Date(sub.current_period_start * 1000),
      currentPeriodEnd:     new Date(sub.current_period_end   * 1000),
      cancelAtPeriodEnd:    sub.cancel_at_period_end,
    },
    update: {
      status,
      interval,
      currentPeriodStart:   new Date(sub.current_period_start * 1000),
      currentPeriodEnd:     new Date(sub.current_period_end   * 1000),
      cancelAtPeriodEnd:    sub.cancel_at_period_end,
    },
  })

  // Grant member-only course access while subscription is healthy
  if (status === 'ACTIVE' || status === 'TRIALING') {
    const memberCourses = await db.course.findMany({
      where:  { isMemberOnly: true, isPublished: true },
      select: { id: true },
    }).catch(() => [])

    for (const course of memberCourses) {
      await db.enrollment.upsert({
        where:  { userId_courseId: { userId: resolvedUserId, courseId: course.id } },
        create: { userId: resolvedUserId, courseId: course.id, accessType: 'MEMBERSHIP' },
        update: { accessType: 'MEMBERSHIP' },
      }).catch(() => { /* skip individual failures */ })
    }

    // Send activation email on first creation only
    if (isNew) {
      const userRec = await db.user.findUnique({
        where:  { id: resolvedUserId },
        select: { email: true, name: true, preferredLocale: true },
      }).catch(() => null)

      if (userRec?.email) {
        const locale = userRec.preferredLocale ?? 'ar'
        const isAr   = locale === 'ar'
        await sendEmail({
          to:      userRec.email,
          subject: isAr ? 'تم تفعيل اشتراكك في المنار' : 'Your ALMANAR membership is active',
          react: React.createElement(SubscriptionEmail, {
            name:     userRec.name ?? '',
            planName: isAr ? plan.nameAr : plan.nameEn,
            interval,
            locale,
            appUrl:   APP_URL,
          }),
        })
      }
    }
  }
}

// ─── customer.subscription.deleted ───────────────────────────────────────────

export async function handleSubscriptionDeleted(
  sub: Stripe.Subscription
): Promise<void> {
  await db.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data:  { status: 'CANCELED', cancelAtPeriodEnd: false },
  }).catch(() => { /* already gone */ })

  // Remove membership-granted enrollments only (keep PURCHASE / FREE / ADMIN)
  const userId = sub.metadata?.almanarUserId
  if (!userId) return

  await db.enrollment.deleteMany({
    where: { userId, accessType: 'MEMBERSHIP' },
  }).catch(() => { /* non-fatal */ })

  // Send cancellation email
  const userRec = await db.user.findUnique({
    where:  { id: userId },
    select: { email: true, name: true, preferredLocale: true },
  }).catch(() => null)

  if (userRec?.email) {
    const locale = userRec.preferredLocale ?? 'ar'
    const isAr   = locale === 'ar'
    await sendEmail({
      to:      userRec.email,
      subject: isAr ? 'انتهى اشتراكك في المنار' : 'Your ALMANAR membership has ended',
      react: React.createElement(SubscriptionCanceledEmail, {
        name:   userRec.name ?? '',
        locale,
        appUrl: APP_URL,
      }),
    })
  }
}

// ─── invoice.payment_failed ───────────────────────────────────────────────────

export async function handlePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const subId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : (invoice.subscription as Stripe.Subscription | null)?.id

  if (!subId) return

  await db.subscription.updateMany({
    where: { stripeSubscriptionId: subId },
    data:  { status: 'PAST_DUE' },
  }).catch(() => { /* non-fatal */ })
}
