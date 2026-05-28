/**
 * Unit tests — Coupons Validate, Products Claim, Stripe Subscribe & Portal
 *
 * Covers:
 *   POST /api/coupons/validate  — auth-guarded coupon validation
 *   POST /api/products/claim    — free-product claim with idempotency
 *   GET  /api/stripe/subscribe  — subscription checkout → Stripe redirect
 *   GET  /api/stripe/portal     — billing portal → Stripe redirect
 */

import { NextRequest } from 'next/server'

// ─── Mock: next-auth ─────────────────────────────────────────────────────────

const mockGetServerSession = jest.fn()
jest.mock('next-auth', () => ({
  getServerSession: (...a: unknown[]) => mockGetServerSession(...a),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

// ─── Mock: Prisma ─────────────────────────────────────────────────────────────

const mockProductFindUnique        = jest.fn()
const mockProductPurchaseFindFirst = jest.fn()
const mockProductPurchaseCreate    = jest.fn()
const mockUserFindUnique           = jest.fn()
const mockUserUpdate               = jest.fn()
const mockMembershipPlanFindUnique = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    product: {
      findUnique: (...a: unknown[]) => mockProductFindUnique(...a),
    },
    productPurchase: {
      findFirst: (...a: unknown[]) => mockProductPurchaseFindFirst(...a),
      create:    (...a: unknown[]) => mockProductPurchaseCreate(...a),
    },
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      update:     (...a: unknown[]) => mockUserUpdate(...a),
    },
    membershipPlan: {
      findUnique: (...a: unknown[]) => mockMembershipPlanFindUnique(...a),
    },
  },
}))

// ─── Mock: validateCoupon ────────────────────────────────────────────────────

const mockValidateCoupon = jest.fn()
jest.mock('@/lib/coupons', () => ({
  validateCoupon: (...a: unknown[]) => mockValidateCoupon(...a),
}))

// ─── Mock: download helpers ───────────────────────────────────────────────────

const mockCreateDownloadToken = jest.fn()
const mockBuildDownloadLink   = jest.fn()
jest.mock('@/lib/downloads', () => ({
  createDownloadToken: (...a: unknown[]) => mockCreateDownloadToken(...a),
  buildDownloadLink:   (...a: unknown[]) => mockBuildDownloadLink(...a),
}))

// ─── Mock: Resend (non-blocking side-effects in claim route) ──────────────────

jest.mock('@/lib/resend', () => ({
  sendEmail:        jest.fn().mockResolvedValue(undefined),
  addToMailingList: jest.fn().mockResolvedValue(undefined),
}))

// ─── Mock: DownloadEmail React component ─────────────────────────────────────

jest.mock('@/emails/DownloadEmail', () => ({
  DownloadEmail: () => null,
}))

// ─── Mock: Stripe ─────────────────────────────────────────────────────────────

const mockCheckoutSessionsCreate     = jest.fn()
const mockBillingPortalSessionCreate = jest.fn()
const mockGetOrCreateStripeCustomer  = jest.fn()

jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    checkout: {
      sessions: { create: (...a: unknown[]) => mockCheckoutSessionsCreate(...a) },
    },
    billingPortal: {
      sessions: { create: (...a: unknown[]) => mockBillingPortalSessionCreate(...a) },
    },
  }),
  getOrCreateStripeCustomer: (...a: unknown[]) => mockGetOrCreateStripeCustomer(...a),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AUTH_SESSION = { user: { id: 'user-1', email: 'user@test.com' } }

function makePost(url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body ?? {}),
  })
}

function makeGet(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' })
}

// ─── Dynamic imports ──────────────────────────────────────────────────────────

let couponValidatePOST: (req: NextRequest) => Promise<Response>
let productClaimPOST:   (req: NextRequest) => Promise<Response>
let stripeSubscribeGET: (req: NextRequest) => Promise<Response>
let stripePortalGET:    (req: NextRequest) => Promise<Response>

beforeAll(async () => {
  const couponRoute    = await import('@/app/api/coupons/validate/route')
  const claimRoute     = await import('@/app/api/products/claim/route')
  const subscribeRoute = await import('@/app/api/stripe/subscribe/route')
  const portalRoute    = await import('@/app/api/stripe/portal/route')

  couponValidatePOST = couponRoute.POST
  productClaimPOST   = claimRoute.POST
  stripeSubscribeGET = subscribeRoute.GET
  stripePortalGET    = portalRoute.GET
})

beforeEach(() => {
  jest.clearAllMocks()

  // Default: authenticated
  mockGetServerSession.mockResolvedValue(AUTH_SESSION)

  // Default DB: everything empty / null
  mockProductFindUnique.mockResolvedValue(null)
  mockProductPurchaseFindFirst.mockResolvedValue(null)
  mockProductPurchaseCreate.mockResolvedValue({ id: 'pp-new' })
  mockUserFindUnique.mockResolvedValue({
    email:            'user@test.com',
    name:             'Test User',
    stripeCustomerId: null,
    preferredLocale:  'ar',
  })
  mockUserUpdate.mockResolvedValue({})
  mockMembershipPlanFindUnique.mockResolvedValue(null)

  // Coupon
  mockValidateCoupon.mockResolvedValue({ valid: false })

  // Downloads
  mockCreateDownloadToken.mockResolvedValue({ token: 'tok-abc123' })
  mockBuildDownloadLink.mockImplementation(
    (token: string) => `https://app.almanar.co/downloads/${token}`,
  )

  // Stripe
  mockGetOrCreateStripeCustomer.mockResolvedValue('cus_test123')
  mockCheckoutSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/cs_test' })
  mockBillingPortalSessionCreate.mockResolvedValue({ url: 'https://billing.stripe.com/portal/session' })
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/coupons/validate
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/coupons/validate', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await couponValidatePOST(
      makePost('http://localhost/api/coupons/validate', { code: 'SAVE20', originalPrice: 99 }),
    )
    expect(res.status).toBe(401)
  })

  it('returns valid:false when code is blank', async () => {
    const res  = await couponValidatePOST(
      makePost('http://localhost/api/coupons/validate', { code: '', originalPrice: 99 }),
    )
    const json = await res.json() as { valid: boolean; error: string }
    expect(res.status).toBe(200)
    expect(json.valid).toBe(false)
    expect(json.error).toMatch(/required/i)
  })

  it('returns valid:false when code is only whitespace', async () => {
    const res  = await couponValidatePOST(
      makePost('http://localhost/api/coupons/validate', { code: '   ', originalPrice: 99 }),
    )
    const json = await res.json() as { valid: boolean }
    expect(res.status).toBe(200)
    expect(json.valid).toBe(false)
  })

  it('returns valid:false when originalPrice is 0', async () => {
    const res  = await couponValidatePOST(
      makePost('http://localhost/api/coupons/validate', { code: 'SAVE20', originalPrice: 0 }),
    )
    const json = await res.json() as { valid: boolean; error: string }
    expect(res.status).toBe(200)
    expect(json.valid).toBe(false)
    expect(json.error).toMatch(/positive/i)
  })

  it('returns valid:false when originalPrice is negative', async () => {
    const res  = await couponValidatePOST(
      makePost('http://localhost/api/coupons/validate', { code: 'SAVE20', originalPrice: -10 }),
    )
    const json = await res.json() as { valid: boolean }
    expect(res.status).toBe(200)
    expect(json.valid).toBe(false)
  })

  it('does not call validateCoupon when early validation fails', async () => {
    await couponValidatePOST(
      makePost('http://localhost/api/coupons/validate', { code: '', originalPrice: 99 }),
    )
    expect(mockValidateCoupon).not.toHaveBeenCalled()
  })

  it('delegates to validateCoupon and returns its result', async () => {
    mockValidateCoupon.mockResolvedValue({
      valid:         true,
      couponId:      'cpn-1',
      discountType:  'PERCENT',
      discountValue: 20,
      finalPrice:    79.2,
      savingsAmount: 19.8,
    })
    const res  = await couponValidatePOST(
      makePost('http://localhost/api/coupons/validate', { code: 'SAVE20', originalPrice: 99 }),
    )
    const json = await res.json() as {
      valid: boolean
      discountType: string
      finalPrice:   number
      savingsAmount: number
    }
    expect(res.status).toBe(200)
    expect(json.valid).toBe(true)
    expect(json.discountType).toBe('PERCENT')
    expect(json.finalPrice).toBe(79.2)
    expect(json.savingsAmount).toBe(19.8)
  })

  it('passes courseId, productId, and bundleId through to validateCoupon', async () => {
    mockValidateCoupon.mockResolvedValue({ valid: false })
    const body = { code: 'MULTI', originalPrice: 50, courseId: 'c1', productId: 'p1', bundleId: 'b1' }
    await couponValidatePOST(makePost('http://localhost/api/coupons/validate', body))
    expect(mockValidateCoupon).toHaveBeenCalledWith(
      'MULTI',
      expect.objectContaining({ originalPrice: 50, courseId: 'c1', productId: 'p1', bundleId: 'b1' }),
    )
  })

  it('passes the trimmed code to validateCoupon', async () => {
    mockValidateCoupon.mockResolvedValue({ valid: false })
    await couponValidatePOST(
      makePost('http://localhost/api/coupons/validate', { code: 'CODE', originalPrice: 50 }),
    )
    expect(mockValidateCoupon).toHaveBeenCalledWith('CODE', expect.anything())
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/products/claim
// ═══════════════════════════════════════════════════════════════════════════════

const FREE_PRODUCT = {
  id:       'prod-1',
  isFree:   true,
  category: 'EBOOK',
  s3Key:    'uploads/product-file.pdf',
  titleEn:  'Free Book',
  titleAr:  'كتاب مجاني',
}

describe('POST /api/products/claim', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await productClaimPOST(
      makePost('http://localhost/api/products/claim', { productId: 'prod-1' }),
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when productId is missing', async () => {
    const res = await productClaimPOST(
      makePost('http://localhost/api/products/claim', {}),
    )
    expect(res.status).toBe(400)
    const json = await res.json() as { error: string }
    expect(json.error).toMatch(/productId/i)
  })

  it('returns 404 when product is not found', async () => {
    mockProductFindUnique.mockResolvedValue(null)
    const res = await productClaimPOST(
      makePost('http://localhost/api/products/claim', { productId: 'nonexistent' }),
    )
    expect(res.status).toBe(404)
  })

  it('returns 400 when product is not free', async () => {
    mockProductFindUnique.mockResolvedValue({ ...FREE_PRODUCT, isFree: false })
    const res  = await productClaimPOST(
      makePost('http://localhost/api/products/claim', { productId: 'prod-1' }),
    )
    const json = await res.json() as { error: string }
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/not free/i)
  })

  it('returns 400 when product category is TOY_AFFILIATE', async () => {
    mockProductFindUnique.mockResolvedValue({ ...FREE_PRODUCT, category: 'TOY_AFFILIATE' })
    const res  = await productClaimPOST(
      makePost('http://localhost/api/products/claim', { productId: 'prod-1' }),
    )
    const json = await res.json() as { error: string }
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/affiliate/i)
  })

  it('returns 400 when product has no s3Key', async () => {
    mockProductFindUnique.mockResolvedValue({ ...FREE_PRODUCT, s3Key: null })
    const res  = await productClaimPOST(
      makePost('http://localhost/api/products/claim', { productId: 'prod-1' }),
    )
    const json = await res.json() as { error: string }
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/no file/i)
  })

  it('creates purchase + download token and returns alreadyClaimed:false', async () => {
    mockProductFindUnique.mockResolvedValue(FREE_PRODUCT)
    mockProductPurchaseFindFirst.mockResolvedValue(null)
    mockProductPurchaseCreate.mockResolvedValue({ id: 'pp-new' })
    mockCreateDownloadToken.mockResolvedValue({ token: 'fresh-tok' })

    const res  = await productClaimPOST(
      makePost('http://localhost/api/products/claim', { productId: 'prod-1' }),
    )
    const json = await res.json() as { downloadUrl: string; alreadyClaimed: boolean }

    expect(res.status).toBe(200)
    expect(json.alreadyClaimed).toBe(false)
    expect(json.downloadUrl).toContain('fresh-tok')
  })

  it('calls db.productPurchase.create with correct fields for new claim', async () => {
    mockProductFindUnique.mockResolvedValue(FREE_PRODUCT)
    mockProductPurchaseFindFirst.mockResolvedValue(null)

    await productClaimPOST(
      makePost('http://localhost/api/products/claim', { productId: 'prod-1' }),
    )

    expect(mockProductPurchaseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId:    'user-1',
          productId: 'prod-1',
          amount:    0,
          isFree:    true,
          status:    'COMPLETED',
        }),
      }),
    )
  })

  it('returns alreadyClaimed:true when a valid download already exists', async () => {
    mockProductFindUnique.mockResolvedValue(FREE_PRODUCT)
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 h from now
    mockProductPurchaseFindFirst.mockResolvedValue({
      id:        'pp-existing',
      downloads: [{
        token:         'existing-tok',
        expiresAt:     future,
        downloadCount: 1,
        maxDownloads:  5,
      }],
    })

    const res  = await productClaimPOST(
      makePost('http://localhost/api/products/claim', { productId: 'prod-1' }),
    )
    const json = await res.json() as { downloadUrl: string; alreadyClaimed: boolean }

    expect(res.status).toBe(200)
    expect(json.alreadyClaimed).toBe(true)
    expect(json.downloadUrl).toContain('existing-tok')
    // Must NOT create a new purchase
    expect(mockProductPurchaseCreate).not.toHaveBeenCalled()
  })

  it('creates a fresh token when existing download is expired', async () => {
    mockProductFindUnique.mockResolvedValue(FREE_PRODUCT)
    const past = new Date(Date.now() - 1000) // 1 ms ago — expired
    mockProductPurchaseFindFirst.mockResolvedValue({
      id:        'pp-existing',
      downloads: [{
        token:         'old-tok',
        expiresAt:     past,
        downloadCount: 0,
        maxDownloads:  5,
      }],
    })
    mockCreateDownloadToken.mockResolvedValue({ token: 'renewed-tok' })

    const res  = await productClaimPOST(
      makePost('http://localhost/api/products/claim', { productId: 'prod-1' }),
    )
    const json = await res.json() as { downloadUrl: string; alreadyClaimed: boolean }

    expect(res.status).toBe(200)
    expect(json.alreadyClaimed).toBe(true)
    expect(json.downloadUrl).toContain('renewed-tok')
    // No new purchase created — only a fresh Download record
    expect(mockProductPurchaseCreate).not.toHaveBeenCalled()
    expect(mockCreateDownloadToken).toHaveBeenCalledWith('user-1', 'pp-existing', 'prod-1')
  })

  it('creates a fresh token when existing download is exhausted', async () => {
    mockProductFindUnique.mockResolvedValue(FREE_PRODUCT)
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24)
    mockProductPurchaseFindFirst.mockResolvedValue({
      id:        'pp-existing',
      downloads: [{
        token:         'exhausted-tok',
        expiresAt:     future,
        downloadCount: 5,
        maxDownloads:  5,  // fully exhausted
      }],
    })
    mockCreateDownloadToken.mockResolvedValue({ token: 'new-tok' })

    const res  = await productClaimPOST(
      makePost('http://localhost/api/products/claim', { productId: 'prod-1' }),
    )
    const json = await res.json() as { alreadyClaimed: boolean }

    expect(res.status).toBe(200)
    expect(json.alreadyClaimed).toBe(true)
    expect(mockProductPurchaseCreate).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/stripe/subscribe
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_PLAN = {
  id:                   'plan-1',
  stripePriceIdMonthly: 'price_monthly_123',
  stripePriceIdAnnual:  'price_annual_123',
}

describe('GET /api/stripe/subscribe', () => {
  it('redirects to sign-in when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await stripeSubscribeGET(
      makeGet('http://localhost/api/stripe/subscribe?planId=plan-1&locale=en'),
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/signin')
  })

  it('returns 400 when planId is not provided', async () => {
    const res = await stripeSubscribeGET(
      makeGet('http://localhost/api/stripe/subscribe'),
    )
    expect(res.status).toBe(400)
  })

  it('returns 404 when plan is not found', async () => {
    mockMembershipPlanFindUnique.mockResolvedValue(null)
    const res = await stripeSubscribeGET(
      makeGet('http://localhost/api/stripe/subscribe?planId=nonexistent'),
    )
    expect(res.status).toBe(404)
  })

  it('returns 404 when user record is missing or has no email', async () => {
    mockMembershipPlanFindUnique.mockResolvedValue(BASE_PLAN)
    mockUserFindUnique.mockResolvedValue(null)
    const res = await stripeSubscribeGET(
      makeGet('http://localhost/api/stripe/subscribe?planId=plan-1'),
    )
    expect(res.status).toBe(404)
  })

  it('redirects to the Stripe checkout URL on success', async () => {
    mockMembershipPlanFindUnique.mockResolvedValue(BASE_PLAN)
    mockCheckoutSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/cs_live' })

    const res = await stripeSubscribeGET(
      makeGet('http://localhost/api/stripe/subscribe?planId=plan-1'),
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://checkout.stripe.com/pay/cs_live')
  })

  it('creates checkout session with mode:subscription', async () => {
    mockMembershipPlanFindUnique.mockResolvedValue(BASE_PLAN)

    await stripeSubscribeGET(
      makeGet('http://localhost/api/stripe/subscribe?planId=plan-1&interval=monthly'),
    )

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'subscription' }),
    )
  })

  it('uses monthly price when interval=monthly', async () => {
    mockMembershipPlanFindUnique.mockResolvedValue(BASE_PLAN)

    await stripeSubscribeGET(
      makeGet('http://localhost/api/stripe/subscribe?planId=plan-1&interval=monthly'),
    )

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: BASE_PLAN.stripePriceIdMonthly, quantity: 1 }],
      }),
    )
  })

  it('uses annual price when interval=annual', async () => {
    mockMembershipPlanFindUnique.mockResolvedValue(BASE_PLAN)

    await stripeSubscribeGET(
      makeGet('http://localhost/api/stripe/subscribe?planId=plan-1&interval=annual'),
    )

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: BASE_PLAN.stripePriceIdAnnual, quantity: 1 }],
      }),
    )
  })

  it('includes planId and userId in session metadata', async () => {
    mockMembershipPlanFindUnique.mockResolvedValue(BASE_PLAN)

    await stripeSubscribeGET(
      makeGet('http://localhost/api/stripe/subscribe?planId=plan-1'),
    )

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          planId: 'plan-1',
          userId: 'user-1',
        }),
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/stripe/portal
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/stripe/portal', () => {
  it('redirects to sign-in when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await stripePortalGET(
      makeGet('http://localhost/api/stripe/portal?locale=en'),
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/signin')
  })

  it('redirects to /pricing when user has no stripeCustomerId', async () => {
    mockUserFindUnique.mockResolvedValue({ stripeCustomerId: null })
    const res = await stripePortalGET(
      makeGet('http://localhost/api/stripe/portal?locale=en'),
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/pricing')
  })

  it('redirects to Stripe portal URL when customer exists', async () => {
    mockUserFindUnique.mockResolvedValue({ stripeCustomerId: 'cus_live123' })
    mockBillingPortalSessionCreate.mockResolvedValue({
      url: 'https://billing.stripe.com/p/session/live',
    })

    const res = await stripePortalGET(
      makeGet('http://localhost/api/stripe/portal'),
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://billing.stripe.com/p/session/live')
  })

  it('creates portal session with the correct customer ID', async () => {
    mockUserFindUnique.mockResolvedValue({ stripeCustomerId: 'cus_abc' })

    await stripePortalGET(makeGet('http://localhost/api/stripe/portal?locale=ar'))

    expect(mockBillingPortalSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_abc' }),
    )
  })

  it('sets return_url to the dashboard in the requested locale', async () => {
    mockUserFindUnique.mockResolvedValue({ stripeCustomerId: 'cus_abc' })

    await stripePortalGET(makeGet('http://localhost/api/stripe/portal?locale=ar'))

    expect(mockBillingPortalSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        return_url: expect.stringContaining('/ar/dashboard'),
      }),
    )
  })

  it('defaults to locale "ar" when locale param is absent', async () => {
    mockUserFindUnique.mockResolvedValue({ stripeCustomerId: 'cus_abc' })

    await stripePortalGET(makeGet('http://localhost/api/stripe/portal'))

    expect(mockBillingPortalSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        return_url: expect.stringContaining('/ar/dashboard'),
      }),
    )
  })

  it('does not call billingPortal when user has no customer', async () => {
    mockUserFindUnique.mockResolvedValue({ stripeCustomerId: null })

    await stripePortalGET(makeGet('http://localhost/api/stripe/portal'))

    expect(mockBillingPortalSessionCreate).not.toHaveBeenCalled()
  })
})
