/**
 * Unit tests for POST /api/stripe/checkout
 *
 * Covers auth guard, input validation, course lookup, enrollment guard,
 * coupon application, and Stripe session creation.
 */

import { NextRequest } from 'next/server'

/* ─── mock: next-auth ────────────────────────────────────────────────────── */
const mockGetServerSession = jest.fn()
jest.mock('next-auth', () => ({
  getServerSession: (...a: unknown[]) => mockGetServerSession(...a),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

/* ─── mock: Prisma ───────────────────────────────────────────────────────── */
const mockCourseFindUnique      = jest.fn()
const mockEnrollmentFindUnique  = jest.fn()
const mockUserFindUnique        = jest.fn()
const mockUserUpdate            = jest.fn()
const mockCoursePurchaseCreate  = jest.fn()
const mockCoursePurchaseUpdate  = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    course:         { findUnique: (...a: unknown[]) => mockCourseFindUnique(...a) },
    enrollment:     { findUnique: (...a: unknown[]) => mockEnrollmentFindUnique(...a) },
    user:           {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      update:     (...a: unknown[]) => mockUserUpdate(...a),
    },
    coursePurchase: {
      create: (...a: unknown[]) => mockCoursePurchaseCreate(...a),
      update: (...a: unknown[]) => mockCoursePurchaseUpdate(...a),
    },
  },
}))

/* ─── mock: Stripe ───────────────────────────────────────────────────────── */
const mockSessionCreate           = jest.fn()
const mockGetOrCreateStripeCustomer = jest.fn()

jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    checkout: { sessions: { create: (...a: unknown[]) => mockSessionCreate(...a) } },
  }),
  getOrCreateStripeCustomer: (...a: unknown[]) => mockGetOrCreateStripeCustomer(...a),
  toCents:         (n: number) => Math.round(n * 100),
  BILLING_CURRENCY: 'usd',
}))

/* ─── mock: coupons ──────────────────────────────────────────────────────── */
const mockValidateCoupon = jest.fn()
const mockRedeemCoupon   = jest.fn()

jest.mock('@/lib/coupons', () => ({
  validateCoupon: (...a: unknown[]) => mockValidateCoupon(...a),
  redeemCoupon:   (...a: unknown[]) => mockRedeemCoupon(...a),
}))

/* ─── helpers ────────────────────────────────────────────────────────────── */
const AUTH_SESSION = { user: { id: 'user-1', email: 'test@test.com' } }

const BASE_COURSE = {
  id:           'c1',
  slug:         'test-course',
  titleEn:      'Test Course',
  titleAr:      'دورة تجريبية',
  price:        { toString: () => '49.00', valueOf: () => 49 },
  isMemberOnly: false,
}

function makeReq(body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/stripe/checkout', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body ?? {}),
  })
}

/* ─── dynamic imports ────────────────────────────────────────────────────── */
let POST: (req: NextRequest) => Promise<Response>

beforeAll(async () => {
  const route = await import('@/app/api/stripe/checkout/route')
  POST = route.POST
})

beforeEach(() => {
  jest.clearAllMocks()
  mockGetServerSession.mockResolvedValue(AUTH_SESSION)
  mockCourseFindUnique.mockResolvedValue(BASE_COURSE)
  mockEnrollmentFindUnique.mockResolvedValue(null)    // not enrolled
  mockUserFindUnique.mockResolvedValue({ stripeCustomerId: null, email: 'test@test.com', name: 'Test' })
  mockGetOrCreateStripeCustomer.mockResolvedValue('cus_test123')
  mockCoursePurchaseCreate.mockResolvedValue({ id: 'purchase-1' })
  mockCoursePurchaseUpdate.mockResolvedValue({})
  mockSessionCreate.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com/pay/cs_test' })
  mockValidateCoupon.mockResolvedValue({ valid: false })
})

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe('POST /api/stripe/checkout — auth', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makeReq({ courseId: 'c1' }))
    expect(res.status).toBe(401)
  })
})

// ─── Input validation ─────────────────────────────────────────────────────────

describe('POST /api/stripe/checkout — validation', () => {
  it('returns 400 when courseId is missing', async () => {
    const res = await POST(makeReq({}))
    expect(res.status).toBe(400)
  })

  it('returns 404 when course not found', async () => {
    mockCourseFindUnique.mockResolvedValue(null)
    const res = await POST(makeReq({ courseId: 'missing' }))
    expect(res.status).toBe(404)
  })

  it('returns 400 when course is member-only', async () => {
    mockCourseFindUnique.mockResolvedValue({ ...BASE_COURSE, isMemberOnly: true })
    const res = await POST(makeReq({ courseId: 'c1' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when course is free (price 0)', async () => {
    mockCourseFindUnique.mockResolvedValue({
      ...BASE_COURSE,
      price: { toString: () => '0.00', valueOf: () => 0 },
    })
    const res = await POST(makeReq({ courseId: 'c1' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/free/i)
  })

  it('returns 409 when already enrolled', async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ id: 'e1' })
    const res = await POST(makeReq({ courseId: 'c1' }))
    expect(res.status).toBe(409)
  })
})

// ─── Successful checkout ──────────────────────────────────────────────────────

describe('POST /api/stripe/checkout — success', () => {
  it('returns a Stripe checkout URL', async () => {
    const res  = await POST(makeReq({ courseId: 'c1' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.url).toMatch(/^https:\/\/checkout\.stripe\.com/)
  })

  it('creates a CoursePurchase record', async () => {
    await POST(makeReq({ courseId: 'c1' }))
    expect(mockCoursePurchaseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId:   'user-1',
          courseId: 'c1',
          status:   'PENDING',
        }),
      }),
    )
  })

  it('creates a Stripe Checkout session with correct line item', async () => {
    await POST(makeReq({ courseId: 'c1' }))
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 4900,  // toCents(49)
              currency:    'usd',
            }),
          }),
        ],
      }),
    )
  })
})

// ─── Coupon application ───────────────────────────────────────────────────────

describe('POST /api/stripe/checkout — coupons', () => {
  it('applies a valid coupon and uses discounted price', async () => {
    mockValidateCoupon.mockResolvedValue({
      valid:        true,
      finalPrice:   29,
      couponId:     'cpn1',
      savingsAmount: 20,
    })
    await POST(makeReq({ courseId: 'c1', couponCode: 'SAVE20' }))
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 2900 }), // 29 * 100
          }),
        ],
      }),
    )
  })

  it('falls back to full price when coupon is invalid', async () => {
    mockValidateCoupon.mockResolvedValue({ valid: false, error: 'expired' })
    await POST(makeReq({ courseId: 'c1', couponCode: 'BADCODE' }))
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 4900 }), // original price
          }),
        ],
      }),
    )
  })

  it('skips coupon validation when no couponCode provided', async () => {
    await POST(makeReq({ courseId: 'c1' }))
    expect(mockValidateCoupon).not.toHaveBeenCalled()
  })
})
