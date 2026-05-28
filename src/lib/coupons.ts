/**
 * Coupon validation utilities.
 *
 * `validateCoupon` is the single source of truth for discount logic —
 * called by the public validate endpoint AND every checkout route so
 * the server always applies the same rules.
 */
import { db } from '@/lib/db'

export interface CouponValidation {
  valid:         boolean
  error?:        string
  couponId?:     string
  discountType?: 'PERCENT' | 'FIXED_AMOUNT'
  discountValue?: number
  /** Final price after discount (≥ 0) */
  finalPrice?:   number
  /** How much the buyer saves */
  savingsAmount?: number
}

interface ValidateOptions {
  /** Original price in dollars */
  originalPrice: number
  /** Optional scope constraints — coupon must match if set */
  courseId?:  string
  productId?: string
  bundleId?:  string
}

/**
 * Validates `code` against the DB and calculates the discounted price.
 *
 * Never throws — always returns `{ valid: false, error }` on any failure.
 */
export async function validateCoupon(
  code: string,
  opts: ValidateOptions,
): Promise<CouponValidation> {
  if (!code?.trim()) {
    return { valid: false, error: 'Coupon code is required' }
  }

  const coupon = await db.coupon.findUnique({
    where:  { code: code.trim().toUpperCase() },
    select: {
      id:            true,
      code:          true,
      discountType:  true,
      discountValue: true,
      courseId:      true,
      productId:     true,
      bundleId:      true,
      usageLimit:    true,
      usageCount:    true,
      validFrom:     true,
      validUntil:    true,
      isActive:      true,
    },
  }).catch(() => null)

  if (!coupon || !coupon.isActive) {
    return { valid: false, error: 'Coupon not found or inactive' }
  }

  // ── Validity window ────────────────────────────────────────────────────────
  const now = new Date()
  if (coupon.validFrom > now) {
    return { valid: false, error: 'Coupon is not yet valid' }
  }
  if (coupon.validUntil && coupon.validUntil < now) {
    return { valid: false, error: 'Coupon has expired' }
  }

  // ── Usage cap ──────────────────────────────────────────────────────────────
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, error: 'Coupon usage limit reached' }
  }

  // ── Scope check ────────────────────────────────────────────────────────────
  if (coupon.courseId  && coupon.courseId  !== opts.courseId)  {
    return { valid: false, error: 'Coupon is not valid for this course' }
  }
  if (coupon.productId && coupon.productId !== opts.productId) {
    return { valid: false, error: 'Coupon is not valid for this product' }
  }
  if (coupon.bundleId  && coupon.bundleId  !== opts.bundleId)  {
    return { valid: false, error: 'Coupon is not valid for this bundle' }
  }

  // ── Calculate discount ─────────────────────────────────────────────────────
  const dv   = Number(coupon.discountValue)
  const type = coupon.discountType as 'PERCENT' | 'FIXED_AMOUNT'

  let savings: number
  if (type === 'PERCENT') {
    savings = Math.min(opts.originalPrice, opts.originalPrice * (dv / 100))
  } else {
    savings = Math.min(opts.originalPrice, dv)
  }

  const finalPrice = Math.max(0, opts.originalPrice - savings)

  return {
    valid:         true,
    couponId:      coupon.id,
    discountType:  type,
    discountValue: dv,
    finalPrice:    parseFloat(finalPrice.toFixed(2)),
    savingsAmount: parseFloat(savings.toFixed(2)),
  }
}

/** Apply a coupon after a successful purchase: increment usageCount + record redemption. */
export async function redeemCoupon(
  couponId:  string,
  userId:    string,
  orderId:   string,
  orderType: 'course' | 'product' | 'bundle',
  discount:  number,
): Promise<void> {
  await Promise.all([
    db.coupon.update({
      where: { id: couponId },
      data:  { usageCount: { increment: 1 } },
    }).catch(() => null),
    db.couponRedemption.upsert({
      where:  { couponId_orderId: { couponId, orderId } },
      create: { couponId, userId, orderId, orderType, discount },
      update: {},
    }).catch(() => null),
  ])
}
