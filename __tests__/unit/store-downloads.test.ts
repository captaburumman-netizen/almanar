/**
 * Unit tests — Digital Product Delivery Pipeline
 *
 * Covers:
 *   GET /api/downloads/[token]          — token-gated S3 file delivery
 *   GET /api/store/checkout             — product Stripe checkout (redirect)
 *   GET /api/store/bundle-checkout      — bundle  Stripe checkout (redirect)
 */

import { NextRequest } from 'next/server'

// ─── Mock: next-auth ──────────────────────────────────────────────────────────

const mockGetServerSession = jest.fn()
jest.mock('next-auth', () => ({
  getServerSession: (...a: unknown[]) => mockGetServerSession(...a),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

// ─── Mock: Prisma ─────────────────────────────────────────────────────────────

const mockDownloadFindUnique   = jest.fn()
const mockDownloadUpdate       = jest.fn()
const mockProductFindUnique    = jest.fn()
const mockProductPurchaseFindFirst = jest.fn()
const mockProductPurchaseCreate    = jest.fn()
const mockProductPurchaseUpdate    = jest.fn()
const mockBundleFindUnique     = jest.fn()
const mockUserFindUnique       = jest.fn()
const mockUserUpdate           = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    download: {
      findUnique: (...a: unknown[]) => mockDownloadFindUnique(...a),
      update:     (...a: unknown[]) => mockDownloadUpdate(...a),
    },
    product: {
      findUnique: (...a: unknown[]) => mockProductFindUnique(...a),
    },
    productPurchase: {
      findFirst: (...a: unknown[]) => mockProductPurchaseFindFirst(...a),
      create:    (...a: unknown[]) => mockProductPurchaseCreate(...a),
      update:    (...a: unknown[]) => mockProductPurchaseUpdate(...a),
    },
    bundle: {
      findUnique: (...a: unknown[]) => mockBundleFindUnique(...a),
    },
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      update:     (...a: unknown[]) => mockUserUpdate(...a),
    },
  },
}))

// ─── Mock: S3 ─────────────────────────────────────────────────────────────────

const mockGetSignedDownloadUrl = jest.fn()

jest.mock('@/lib/s3', () => ({
  getSignedDownloadUrl:    (...a: unknown[]) => mockGetSignedDownloadUrl(...a),
  DOWNLOAD_TTL_HOURS:      48,
  DOWNLOAD_MAX_REGENERATIONS: 5,
}))

// ─── Mock: Stripe ─────────────────────────────────────────────────────────────

const mockSessionCreate             = jest.fn()
const mockGetOrCreateStripeCustomer = jest.fn()

jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    checkout: { sessions: { create: (...a: unknown[]) => mockSessionCreate(...a) } },
  }),
  getOrCreateStripeCustomer: (...a: unknown[]) => mockGetOrCreateStripeCustomer(...a),
  toCents:          (n: number) => Math.round(n * 100),
  BILLING_CURRENCY: 'usd',
}))

// ─── Mock: coupons ────────────────────────────────────────────────────────────

const mockValidateCoupon = jest.fn()

jest.mock('@/lib/coupons', () => ({
  validateCoupon: (...a: unknown[]) => mockValidateCoupon(...a),
  redeemCoupon:   jest.fn(),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AUTH_SESSION = { user: { id: 'user-1', email: 'buyer@test.com' } }

function makeGet(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' })
}

function makeParams(p: { token: string }) {
  return { params: Promise.resolve(p) }
}

// Fixture data
const BASE_PRODUCT = {
  id:       'p1',
  slug:     'my-ebook',
  titleEn:  'My Ebook',
  titleAr:  'كتابي',
  price:    { toString: () => '19.00', valueOf: () => 19 },
  isFree:   false,
  category: 'EBOOK',
  s3Key:    'products/my-ebook.pdf',
}

const BASE_BUNDLE = {
  id:      'b1',
  slug:    'design-bundle',
  titleEn: 'Design Bundle',
  titleAr: 'حزمة التصميم',
  price:   { toString: () => '39.00', valueOf: () => 39 },
  items:   [
    { product: { id: 'p1', s3Key: 'products/p1.pdf' } },
    { product: { id: 'p2', s3Key: 'products/p2.pdf' } },
  ],
}

const BASE_DOWNLOAD = {
  id:            'dl-1',
  productId:     'p1',
  expiresAt:     new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 h from now
  downloadCount: 0,
  maxDownloads:  5,
}

// ─── Dynamic imports ──────────────────────────────────────────────────────────

let downloadGET:     (req: NextRequest, ctx: { params: Promise<{ token: string }> }) => Promise<Response>
let storeCheckout:   (req: NextRequest) => Promise<Response>
let bundleCheckout:  (req: NextRequest) => Promise<Response>

beforeAll(async () => {
  const dlRoute      = await import('@/app/api/downloads/[token]/route')
  const storeRoute   = await import('@/app/api/store/checkout/route')
  const bundleRoute  = await import('@/app/api/store/bundle-checkout/route')

  downloadGET    = dlRoute.GET
  storeCheckout  = storeRoute.GET
  bundleCheckout = bundleRoute.GET
})

beforeEach(() => {
  jest.clearAllMocks()
  mockGetServerSession.mockResolvedValue(AUTH_SESSION)
  mockProductFindUnique.mockResolvedValue(BASE_PRODUCT)
  mockBundleFindUnique.mockResolvedValue(BASE_BUNDLE)
  mockProductPurchaseFindFirst.mockResolvedValue(null)            // not yet purchased
  mockProductPurchaseCreate.mockResolvedValue({ id: 'pur-1' })
  mockProductPurchaseUpdate.mockResolvedValue({})
  mockUserFindUnique.mockResolvedValue({ stripeCustomerId: 'cus_old', email: 'buyer@test.com', name: 'Buyer' })
  mockGetOrCreateStripeCustomer.mockResolvedValue('cus_test')
  mockSessionCreate.mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.com/pay/cs_1' })
  mockValidateCoupon.mockResolvedValue({ valid: false })
  mockDownloadFindUnique.mockResolvedValue(BASE_DOWNLOAD)
  mockDownloadUpdate.mockResolvedValue({})
  mockGetSignedDownloadUrl.mockResolvedValue('https://s3.amazonaws.com/bucket/file.pdf?sig=xyz')
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/downloads/[token]
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/downloads/[token]', () => {
  it('returns 404 when token does not exist', async () => {
    mockDownloadFindUnique.mockResolvedValue(null)
    const res = await downloadGET(
      makeGet('http://localhost/api/downloads/bad-token'),
      makeParams({ token: 'bad-token' }),
    )
    expect(res.status).toBe(404)
  })

  it('returns 410 when the download link has expired', async () => {
    mockDownloadFindUnique.mockResolvedValue({
      ...BASE_DOWNLOAD,
      expiresAt: new Date(Date.now() - 1000), // past
    })
    const res = await downloadGET(
      makeGet('http://localhost/api/downloads/tok'),
      makeParams({ token: 'tok' }),
    )
    expect(res.status).toBe(410)
  })

  it('returns 429 when download limit reached', async () => {
    mockDownloadFindUnique.mockResolvedValue({
      ...BASE_DOWNLOAD,
      downloadCount: 5,
      maxDownloads:  5,
    })
    const res = await downloadGET(
      makeGet('http://localhost/api/downloads/tok'),
      makeParams({ token: 'tok' }),
    )
    expect(res.status).toBe(429)
  })

  it('returns 404 when product has no s3Key', async () => {
    mockProductFindUnique.mockResolvedValue({ s3Key: null, titleEn: 'No file' })
    const res = await downloadGET(
      makeGet('http://localhost/api/downloads/tok'),
      makeParams({ token: 'tok' }),
    )
    expect(res.status).toBe(404)
  })

  it('returns 500 when S3 signing fails', async () => {
    mockProductFindUnique.mockResolvedValue({ s3Key: 'products/file.pdf', titleEn: 'Good' })
    mockGetSignedDownloadUrl.mockResolvedValue(null)
    const res = await downloadGET(
      makeGet('http://localhost/api/downloads/tok'),
      makeParams({ token: 'tok' }),
    )
    expect(res.status).toBe(500)
  })

  it('redirects (307) to the signed S3 URL on success', async () => {
    mockProductFindUnique.mockResolvedValue({ s3Key: 'products/file.pdf', titleEn: 'Good' })
    const res = await downloadGET(
      makeGet('http://localhost/api/downloads/tok'),
      makeParams({ token: 'tok' }),
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('s3.amazonaws.com')
  })

  it('increments the download counter on a successful download', async () => {
    mockProductFindUnique.mockResolvedValue({ s3Key: 'products/file.pdf', titleEn: 'Good' })
    await downloadGET(
      makeGet('http://localhost/api/downloads/tok'),
      makeParams({ token: 'tok' }),
    )
    expect(mockDownloadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dl-1' },
        data:  { downloadCount: { increment: 1 } },
      }),
    )
  })

  it('sets Cache-Control: no-store on the redirect response', async () => {
    mockProductFindUnique.mockResolvedValue({ s3Key: 'products/file.pdf', titleEn: 'Good' })
    const res = await downloadGET(
      makeGet('http://localhost/api/downloads/tok'),
      makeParams({ token: 'tok' }),
    )
    expect(res.headers.get('cache-control')).toMatch(/no-store/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/store/checkout  (product)
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/store/checkout', () => {
  function makeStoreReq(params: Record<string, string> = {}): NextRequest {
    const sp = new URLSearchParams({ productId: 'p1', locale: 'en', ...params })
    return makeGet(`http://localhost/api/store/checkout?${sp}`)
  }

  it('redirects unauthenticated users to sign-in', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await storeCheckout(makeStoreReq())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/signin')
  })

  it('returns 400 when productId is missing', async () => {
    const res = await storeCheckout(makeGet('http://localhost/api/store/checkout?locale=en'))
    expect(res.status).toBe(400)
  })

  it('returns 404 when product is not found', async () => {
    mockProductFindUnique.mockResolvedValue(null)
    const res = await storeCheckout(makeStoreReq())
    expect(res.status).toBe(404)
  })

  it('returns 400 when product is free', async () => {
    mockProductFindUnique.mockResolvedValue({ ...BASE_PRODUCT, isFree: true })
    const res = await storeCheckout(makeStoreReq())
    expect(res.status).toBe(400)
  })

  it('returns 400 when product is TOY_AFFILIATE', async () => {
    mockProductFindUnique.mockResolvedValue({ ...BASE_PRODUCT, category: 'TOY_AFFILIATE' })
    const res = await storeCheckout(makeStoreReq())
    expect(res.status).toBe(400)
  })

  it('returns 400 when product has no s3Key', async () => {
    mockProductFindUnique.mockResolvedValue({ ...BASE_PRODUCT, s3Key: null })
    const res = await storeCheckout(makeStoreReq())
    expect(res.status).toBe(400)
  })

  it('redirects to dashboard when product already purchased', async () => {
    mockProductPurchaseFindFirst.mockResolvedValue({ id: 'existing' })
    const res = await storeCheckout(makeStoreReq())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/dashboard')
  })

  it('redirects (307) to Stripe checkout URL on success', async () => {
    const res = await storeCheckout(makeStoreReq())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('checkout.stripe.com')
  })

  it('creates a ProductPurchase with PENDING status', async () => {
    await storeCheckout(makeStoreReq())
    expect(mockProductPurchaseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId:   'user-1',
          productId: 'p1',
          status:   'PENDING',
          isFree:   false,
        }),
      }),
    )
  })

  it('creates Stripe session with correct product price in cents', async () => {
    await storeCheckout(makeStoreReq())
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 1900,   // 19 * 100
              currency:    'usd',
            }),
          }),
        ],
      }),
    )
  })

  it('applies a valid coupon and uses discounted price', async () => {
    mockValidateCoupon.mockResolvedValue({
      valid:        true,
      finalPrice:   9,
      couponId:     'cpn1',
      savingsAmount: 10,
    })
    await storeCheckout(makeStoreReq({ productId: 'p1', locale: 'en', couponCode: 'HALF' }))
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 900 }), // 9 * 100
          }),
        ],
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/store/bundle-checkout  (bundle)
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/store/bundle-checkout', () => {
  function makeBundleReq(params: Record<string, string> = {}): NextRequest {
    const sp = new URLSearchParams({ bundleId: 'b1', locale: 'en', ...params })
    return makeGet(`http://localhost/api/store/bundle-checkout?${sp}`)
  }

  it('redirects unauthenticated users to sign-in', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await bundleCheckout(makeBundleReq())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/signin')
  })

  it('returns 400 when bundleId is missing', async () => {
    const res = await bundleCheckout(makeGet('http://localhost/api/store/bundle-checkout?locale=en'))
    expect(res.status).toBe(400)
  })

  it('returns 404 when bundle is not found', async () => {
    mockBundleFindUnique.mockResolvedValue(null)
    const res = await bundleCheckout(makeBundleReq())
    expect(res.status).toBe(404)
  })

  it('returns 400 when bundle has no items', async () => {
    mockBundleFindUnique.mockResolvedValue({ ...BASE_BUNDLE, items: [] })
    const res = await bundleCheckout(makeBundleReq())
    expect(res.status).toBe(400)
  })

  it('returns 400 when bundle price is 0', async () => {
    mockBundleFindUnique.mockResolvedValue({
      ...BASE_BUNDLE,
      price: { toString: () => '0.00', valueOf: () => 0 },
    })
    const res = await bundleCheckout(makeBundleReq())
    expect(res.status).toBe(400)
  })

  it('redirects to dashboard when bundle already purchased', async () => {
    mockProductPurchaseFindFirst.mockResolvedValue({ id: 'existing' })
    const res = await bundleCheckout(makeBundleReq())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/dashboard')
  })

  it('redirects (307) to Stripe checkout URL on success', async () => {
    const res = await bundleCheckout(makeBundleReq())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('checkout.stripe.com')
  })

  it('creates a ProductPurchase with PENDING status for the bundle', async () => {
    await bundleCheckout(makeBundleReq())
    expect(mockProductPurchaseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId:   'user-1',
          bundleId: 'b1',
          status:   'PENDING',
          isFree:   false,
        }),
      }),
    )
  })

  it('creates Stripe session with correct bundle price in cents', async () => {
    await bundleCheckout(makeBundleReq())
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 3900,   // 39 * 100
              currency:    'usd',
            }),
          }),
        ],
      }),
    )
  })

  it('applies a valid coupon and uses discounted price for bundle', async () => {
    mockValidateCoupon.mockResolvedValue({
      valid:        true,
      finalPrice:   19,
      couponId:     'cpn2',
      savingsAmount: 20,
    })
    await bundleCheckout(makeBundleReq({ bundleId: 'b1', locale: 'en', couponCode: 'HALF50' }))
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 1900 }), // 19 * 100
          }),
        ],
      }),
    )
  })

  it('falls back to full price when coupon is invalid for bundle', async () => {
    mockValidateCoupon.mockResolvedValue({ valid: false, error: 'expired' })
    await bundleCheckout(makeBundleReq({ bundleId: 'b1', locale: 'en', couponCode: 'BADCODE' }))
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 3900 }), // full price
          }),
        ],
      }),
    )
  })
})
