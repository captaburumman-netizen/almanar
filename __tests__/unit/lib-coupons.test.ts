/**
 * Unit tests — src/lib/coupons.ts
 *
 * Covers:
 *   validateCoupon  — all guard clauses + discount arithmetic
 *   redeemCoupon    — increment usageCount + upsert redemption record
 *
 * The clock is pinned to a fixed "now" so validity-window checks
 * are deterministic.
 */

// ─── Fixed clock ──────────────────────────────────────────────────────────────

const FIXED_NOW = new Date('2024-06-15T12:00:00Z')

beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(FIXED_NOW)
})

afterAll(() => {
  jest.useRealTimers()
})

// ─── Mock: Prisma ─────────────────────────────────────────────────────────────

const mockCouponFindUnique       = jest.fn()
const mockCouponUpdate           = jest.fn()
const mockCouponRedemptionUpsert = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    coupon: {
      findUnique: (...a: unknown[]) => mockCouponFindUnique(...a),
      update:     (...a: unknown[]) => mockCouponUpdate(...a),
    },
    couponRedemption: {
      upsert: (...a: unknown[]) => mockCouponRedemptionUpsert(...a),
    },
  },
}))

// ─── Dynamic imports ──────────────────────────────────────────────────────────

import { validateCoupon, redeemCoupon } from '@/lib/coupons'

// ─── Coupon fixture ───────────────────────────────────────────────────────────

/** A valid PERCENT coupon with no scope or usage restrictions. */
const BASE_PERCENT = {
  id:            'cpn-percent',
  code:          'SAVE20',
  discountType:  'PERCENT',
  discountValue: 20,
  courseId:      null,
  productId:     null,
  bundleId:      null,
  usageLimit:    null,
  usageCount:    0,
  validFrom:     new Date('2024-01-01'),   // in the past — already valid
  validUntil:    new Date('2024-12-31'),   // in the future — not yet expired
  isActive:      true,
}

/** A valid FIXED_AMOUNT coupon. */
const BASE_FIXED = {
  ...BASE_PERCENT,
  id:            'cpn-fixed',
  code:          'OFF10',
  discountType:  'FIXED_AMOUNT',
  discountValue: 10,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCouponFindUnique.mockResolvedValue(BASE_PERCENT)
  mockCouponUpdate.mockResolvedValue({})
  mockCouponRedemptionUpsert.mockResolvedValue({})
})

// ═══════════════════════════════════════════════════════════════════════════════
// validateCoupon — guard clauses
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateCoupon — guard clauses', () => {
  it('returns valid:false when code is an empty string', async () => {
    const result = await validateCoupon('', { originalPrice: 100 })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/required/i)
    expect(mockCouponFindUnique).not.toHaveBeenCalled()
  })

  it('returns valid:false when code is only whitespace', async () => {
    const result = await validateCoupon('   ', { originalPrice: 100 })
    expect(result.valid).toBe(false)
    expect(mockCouponFindUnique).not.toHaveBeenCalled()
  })

  it('returns valid:false when coupon is not found in DB', async () => {
    mockCouponFindUnique.mockResolvedValue(null)
    const result = await validateCoupon('NONEXISTENT', { originalPrice: 100 })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/not found/i)
  })

  it('returns valid:false when coupon is found but isActive is false', async () => {
    mockCouponFindUnique.mockResolvedValue({ ...BASE_PERCENT, isActive: false })
    const result = await validateCoupon('SAVE20', { originalPrice: 100 })
    expect(result.valid).toBe(false)
  })

  it('returns valid:false when validFrom is in the future', async () => {
    // validFrom = 2024-07-01, FIXED_NOW = 2024-06-15 → not yet valid
    mockCouponFindUnique.mockResolvedValue({
      ...BASE_PERCENT,
      validFrom: new Date('2024-07-01'),
    })
    const result = await validateCoupon('SAVE20', { originalPrice: 100 })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/not yet valid/i)
  })

  it('returns valid:false when validUntil is in the past', async () => {
    // validUntil = 2024-06-01, FIXED_NOW = 2024-06-15 → already expired
    mockCouponFindUnique.mockResolvedValue({
      ...BASE_PERCENT,
      validUntil: new Date('2024-06-01'),
    })
    const result = await validateCoupon('SAVE20', { originalPrice: 100 })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/expired/i)
  })

  it('does not reject when validUntil is null (no expiry)', async () => {
    mockCouponFindUnique.mockResolvedValue({ ...BASE_PERCENT, validUntil: null })
    const result = await validateCoupon('SAVE20', { originalPrice: 100 })
    expect(result.valid).toBe(true)
  })

  it('returns valid:false when usageLimit is reached', async () => {
    mockCouponFindUnique.mockResolvedValue({
      ...BASE_PERCENT,
      usageLimit: 5,
      usageCount: 5,  // at cap
    })
    const result = await validateCoupon('SAVE20', { originalPrice: 100 })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/limit/i)
  })

  it('does not reject when usageCount is below the usageLimit', async () => {
    mockCouponFindUnique.mockResolvedValue({
      ...BASE_PERCENT,
      usageLimit: 5,
      usageCount: 4,
    })
    const result = await validateCoupon('SAVE20', { originalPrice: 100 })
    expect(result.valid).toBe(true)
  })

  it('does not reject when usageLimit is null (unlimited)', async () => {
    mockCouponFindUnique.mockResolvedValue({ ...BASE_PERCENT, usageLimit: null, usageCount: 999 })
    const result = await validateCoupon('SAVE20', { originalPrice: 100 })
    expect(result.valid).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// validateCoupon — scope checks
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateCoupon — scope checks', () => {
  it('returns valid:false when coupon is scoped to a different course', async () => {
    mockCouponFindUnique.mockResolvedValue({ ...BASE_PERCENT, courseId: 'course-A' })
    const result = await validateCoupon('SAVE20', { originalPrice: 100, courseId: 'course-B' })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/not valid for this course/i)
  })

  it('accepts coupon when courseId matches the scope', async () => {
    mockCouponFindUnique.mockResolvedValue({ ...BASE_PERCENT, courseId: 'course-A' })
    const result = await validateCoupon('SAVE20', { originalPrice: 100, courseId: 'course-A' })
    expect(result.valid).toBe(true)
  })

  it('returns valid:false when coupon is scoped to a different product', async () => {
    mockCouponFindUnique.mockResolvedValue({ ...BASE_PERCENT, productId: 'prod-1' })
    const result = await validateCoupon('SAVE20', { originalPrice: 100, productId: 'prod-2' })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/not valid for this product/i)
  })

  it('accepts coupon when productId matches the scope', async () => {
    mockCouponFindUnique.mockResolvedValue({ ...BASE_PERCENT, productId: 'prod-1' })
    const result = await validateCoupon('SAVE20', { originalPrice: 100, productId: 'prod-1' })
    expect(result.valid).toBe(true)
  })

  it('returns valid:false when coupon is scoped to a different bundle', async () => {
    mockCouponFindUnique.mockResolvedValue({ ...BASE_PERCENT, bundleId: 'bundle-X' })
    const result = await validateCoupon('SAVE20', { originalPrice: 100, bundleId: 'bundle-Y' })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/not valid for this bundle/i)
  })

  it('accepts a global coupon (no scope) for any product/course/bundle', async () => {
    // BASE_PERCENT has all scope fields null
    const result = await validateCoupon('SAVE20', {
      originalPrice: 100,
      courseId: 'any-course',
      productId: 'any-product',
      bundleId: 'any-bundle',
    })
    expect(result.valid).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// validateCoupon — discount arithmetic (PERCENT)
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateCoupon — PERCENT discount', () => {
  it('returns correct finalPrice and savingsAmount for 20% off $100', async () => {
    const result = await validateCoupon('SAVE20', { originalPrice: 100 })
    expect(result.valid).toBe(true)
    expect(result.finalPrice).toBe(80)
    expect(result.savingsAmount).toBe(20)
  })

  it('returns correct values for 10% off $49.99', async () => {
    mockCouponFindUnique.mockResolvedValue({ ...BASE_PERCENT, discountValue: 10 })
    const result = await validateCoupon('SAVE20', { originalPrice: 49.99 })
    expect(result.valid).toBe(true)
    expect(result.finalPrice).toBe(44.99)    // 49.99 * 0.9 = 44.991 → toFixed(2) → 44.99
    expect(result.savingsAmount).toBe(5)     // 49.99 * 0.1 = 4.999  → toFixed(2) → 5.00
  })

  it('returns correct values for 50% off $200', async () => {
    mockCouponFindUnique.mockResolvedValue({ ...BASE_PERCENT, discountValue: 50 })
    const result = await validateCoupon('SAVE20', { originalPrice: 200 })
    expect(result.valid).toBe(true)
    expect(result.finalPrice).toBe(100)
    expect(result.savingsAmount).toBe(100)
  })

  it('clamps finalPrice to 0 when 100% discount applied', async () => {
    mockCouponFindUnique.mockResolvedValue({ ...BASE_PERCENT, discountValue: 100 })
    const result = await validateCoupon('SAVE20', { originalPrice: 50 })
    expect(result.finalPrice).toBe(0)
    expect(result.savingsAmount).toBe(50)
  })

  it('includes discountType and discountValue in the response', async () => {
    const result = await validateCoupon('SAVE20', { originalPrice: 100 })
    expect(result.discountType).toBe('PERCENT')
    expect(result.discountValue).toBe(20)
    expect(result.couponId).toBe('cpn-percent')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// validateCoupon — discount arithmetic (FIXED_AMOUNT)
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateCoupon — FIXED_AMOUNT discount', () => {
  beforeEach(() => {
    mockCouponFindUnique.mockResolvedValue(BASE_FIXED)
  })

  it('returns correct finalPrice for $10 off $100', async () => {
    const result = await validateCoupon('OFF10', { originalPrice: 100 })
    expect(result.valid).toBe(true)
    expect(result.finalPrice).toBe(90)
    expect(result.savingsAmount).toBe(10)
  })

  it('returns correct finalPrice for $10 off $7.50 (discount > price → 0)', async () => {
    const result = await validateCoupon('OFF10', { originalPrice: 7.50 })
    expect(result.finalPrice).toBe(0)
    expect(result.savingsAmount).toBe(7.50)
  })

  it('returns correct finalPrice for $10 off $10 (exactly 0)', async () => {
    const result = await validateCoupon('OFF10', { originalPrice: 10 })
    expect(result.finalPrice).toBe(0)
    expect(result.savingsAmount).toBe(10)
  })

  it('includes discountType FIXED_AMOUNT in the response', async () => {
    const result = await validateCoupon('OFF10', { originalPrice: 100 })
    expect(result.discountType).toBe('FIXED_AMOUNT')
    expect(result.discountValue).toBe(10)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// validateCoupon — DB lookup normalisation
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateCoupon — DB lookup', () => {
  it('uppercases the code before querying the DB', async () => {
    await validateCoupon('save20', { originalPrice: 100 })
    expect(mockCouponFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: 'SAVE20' },
      }),
    )
  })

  it('trims whitespace from the code before querying', async () => {
    await validateCoupon('  SAVE20  ', { originalPrice: 100 })
    expect(mockCouponFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: 'SAVE20' },
      }),
    )
  })

  it('returns valid:false (not throw) when DB lookup throws', async () => {
    mockCouponFindUnique.mockRejectedValue(new Error('DB connection lost'))
    const result = await validateCoupon('SAVE20', { originalPrice: 100 })
    expect(result.valid).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// redeemCoupon
// ═══════════════════════════════════════════════════════════════════════════════

describe('redeemCoupon', () => {
  it('increments usageCount for the coupon', async () => {
    await redeemCoupon('cpn-1', 'user-1', 'order-1', 'course', 20)
    expect(mockCouponUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cpn-1' },
        data:  { usageCount: { increment: 1 } },
      }),
    )
  })

  it('upserts a CouponRedemption record', async () => {
    await redeemCoupon('cpn-1', 'user-1', 'order-1', 'product', 15)
    expect(mockCouponRedemptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { couponId_orderId: { couponId: 'cpn-1', orderId: 'order-1' } },
        create: expect.objectContaining({
          couponId:  'cpn-1',
          userId:    'user-1',
          orderId:   'order-1',
          orderType: 'product',
          discount:  15,
        }),
        update: {},
      }),
    )
  })

  it('does not throw when coupon update fails (non-fatal)', async () => {
    mockCouponUpdate.mockRejectedValue(new Error('DB error'))
    await expect(redeemCoupon('cpn-1', 'user-1', 'order-1', 'bundle', 5)).resolves.toBeUndefined()
  })

  it('does not throw when couponRedemption upsert fails (non-fatal)', async () => {
    mockCouponRedemptionUpsert.mockRejectedValue(new Error('DB error'))
    await expect(redeemCoupon('cpn-1', 'user-1', 'order-1', 'course', 0)).resolves.toBeUndefined()
  })

  it('runs both the update and the upsert in parallel', async () => {
    await redeemCoupon('cpn-1', 'user-1', 'order-1', 'course', 25)
    // Both mocks must have been called (Promise.all)
    expect(mockCouponUpdate).toHaveBeenCalledTimes(1)
    expect(mockCouponRedemptionUpsert).toHaveBeenCalledTimes(1)
  })
})
