/**
 * Unit tests for /api/admin/coupons/* routes.
 *
 * Covers:
 *   GET    /api/admin/coupons              — list
 *   POST   /api/admin/coupons              — create
 *   GET    /api/admin/coupons/[couponId]   — detail
 *   PATCH  /api/admin/coupons/[couponId]   — update
 *   DELETE /api/admin/coupons/[couponId]   — hard delete
 */

import { NextRequest } from 'next/server'

/* ─── mock: adminGuard ───────────────────────────────────────────────────── */
const mockRequireAdminSession = jest.fn()

jest.mock('@/lib/adminGuard', () => ({
  requireAdminSession: (...a: unknown[]) => mockRequireAdminSession(...a),
}))

/* ─── mock: Prisma ───────────────────────────────────────────────────────── */
const mockCouponFindMany   = jest.fn()
const mockCouponFindUnique = jest.fn()
const mockCouponCreate     = jest.fn()
const mockCouponUpdate     = jest.fn()
const mockCouponDelete     = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    coupon: {
      findMany:   (...a: unknown[]) => mockCouponFindMany(...a),
      findUnique: (...a: unknown[]) => mockCouponFindUnique(...a),
      create:     (...a: unknown[]) => mockCouponCreate(...a),
      update:     (...a: unknown[]) => mockCouponUpdate(...a),
      delete:     (...a: unknown[]) => mockCouponDelete(...a),
    },
  },
}))

/* ─── helpers ────────────────────────────────────────────────────────────── */
const ADMIN_SESSION = {
  session: { user: { id: 'admin-1', role: 'ADMIN', email: 'admin@example.com' } },
  error:   null,
}
const UNAUTHED = {
  session: null,
  error:   new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}

function makeReq(method = 'GET', body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/coupons', {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  })
}

function makeParams(couponId: string) {
  return { params: Promise.resolve({ couponId }) }
}

/* ─── dynamic imports ────────────────────────────────────────────────────── */
let GET:    (req: NextRequest) => Promise<any>
let POST:   (req: NextRequest) => Promise<any>
let GET1:   (req: NextRequest, ctx: any) => Promise<any>
let PATCH1: (req: NextRequest, ctx: any) => Promise<any>
let DEL1:   (req: NextRequest, ctx: any) => Promise<any>

beforeAll(async () => {
  const list   = await import('@/app/api/admin/coupons/route')
  const detail = await import('@/app/api/admin/coupons/[couponId]/route')
  GET    = list.GET
  POST   = list.POST
  GET1   = detail.GET
  PATCH1 = detail.PATCH
  DEL1   = detail.DELETE
})

beforeEach(() => {
  jest.clearAllMocks()
  mockRequireAdminSession.mockResolvedValue(ADMIN_SESSION)
})

// ─── GET /api/admin/coupons ───────────────────────────────────────────────────

describe('GET /api/admin/coupons', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED)
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns coupon list', async () => {
    const coupons = [
      { id: 'c1', code: 'SAVE10', discountType: 'PERCENT', discountValue: 10, _count: { redemptions: 3 } },
      { id: 'c2', code: 'FLAT5',  discountType: 'FIXED_AMOUNT', discountValue: 5, _count: { redemptions: 0 } },
    ]
    mockCouponFindMany.mockResolvedValue(coupons)
    const res  = await GET(makeReq())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.coupons).toHaveLength(2)
    expect(json.coupons[0].code).toBe('SAVE10')
  })

  it('returns empty array when DB throws', async () => {
    mockCouponFindMany.mockRejectedValue(new Error('db down'))
    const res  = await GET(makeReq())
    const json = await res.json()
    expect(json.coupons).toEqual([])
  })
})

// ─── POST /api/admin/coupons ──────────────────────────────────────────────────

describe('POST /api/admin/coupons', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED)
    const res = await POST(makeReq('POST', { code: 'X', discountType: 'PERCENT', discountValue: 10 }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when code is missing', async () => {
    const res  = await POST(makeReq('POST', { discountType: 'PERCENT', discountValue: 10 }))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/code/i)
  })

  it('returns 400 when discountType is invalid', async () => {
    const res  = await POST(makeReq('POST', { code: 'ABC', discountType: 'BOGUS', discountValue: 10 }))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/discountType/i)
  })

  it('returns 400 when discountValue is zero', async () => {
    const res  = await POST(makeReq('POST', { code: 'ABC', discountType: 'PERCENT', discountValue: 0 }))
    const json = await res.json()
    expect(res.status).toBe(400)
  })

  it('returns 400 when percent exceeds 100', async () => {
    const res  = await POST(makeReq('POST', { code: 'ABC', discountType: 'PERCENT', discountValue: 150 }))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/100/i)
  })

  it('returns 409 when code already exists', async () => {
    mockCouponFindUnique.mockResolvedValue({ id: 'existing' })
    const res  = await POST(makeReq('POST', { code: 'SAVE10', discountType: 'PERCENT', discountValue: 10 }))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toMatch(/SAVE10/)
  })

  it('creates coupon and returns 201 with id + code', async () => {
    mockCouponFindUnique.mockResolvedValue(null) // uniqueness check: not found
    mockCouponCreate.mockResolvedValue({ id: 'new-id', code: 'PROMO25' })
    const res  = await POST(makeReq('POST', { code: 'promo25', discountType: 'PERCENT', discountValue: 25 }))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.coupon).toMatchObject({ id: 'new-id', code: 'PROMO25' })
  })

  it('uppercases the code before saving', async () => {
    mockCouponFindUnique.mockResolvedValue(null)
    mockCouponCreate.mockResolvedValue({ id: 'x', code: 'LOWER' })
    await POST(makeReq('POST', { code: 'lower', discountType: 'FIXED_AMOUNT', discountValue: 5 }))
    expect(mockCouponCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ code: 'LOWER' }) })
    )
  })

  it('accepts FIXED_AMOUNT discount type', async () => {
    mockCouponFindUnique.mockResolvedValue(null)
    mockCouponCreate.mockResolvedValue({ id: 'y', code: 'FLAT5' })
    const res = await POST(makeReq('POST', { code: 'FLAT5', discountType: 'FIXED_AMOUNT', discountValue: 5 }))
    expect(res.status).toBe(201)
  })

  it('stores optional courseId / productId / bundleId', async () => {
    mockCouponFindUnique.mockResolvedValue(null)
    mockCouponCreate.mockResolvedValue({ id: 'z', code: 'SCOPED' })
    await POST(makeReq('POST', {
      code: 'SCOPED', discountType: 'PERCENT', discountValue: 10,
      courseId: 'course-1',
    }))
    expect(mockCouponCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ courseId: 'course-1' }) })
    )
  })
})

// ─── GET /api/admin/coupons/[couponId] ───────────────────────────────────────

describe('GET /api/admin/coupons/[couponId]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED)
    const res = await GET1(makeReq(), makeParams('c1'))
    expect(res.status).toBe(401)
  })

  it('returns 404 when coupon not found', async () => {
    mockCouponFindUnique.mockResolvedValue(null)
    const res = await GET1(makeReq(), makeParams('missing'))
    expect(res.status).toBe(404)
  })

  it('returns coupon with redemption count', async () => {
    const coupon = { id: 'c1', code: 'PROMO', _count: { redemptions: 5 } }
    mockCouponFindUnique.mockResolvedValue(coupon)
    const res  = await GET1(makeReq(), makeParams('c1'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.coupon._count.redemptions).toBe(5)
  })
})

// ─── PATCH /api/admin/coupons/[couponId] ─────────────────────────────────────

describe('PATCH /api/admin/coupons/[couponId]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED)
    const res = await PATCH1(makeReq('PATCH', { isActive: false }), makeParams('c1'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when no fields provided', async () => {
    const res  = await PATCH1(makeReq('PATCH', {}), makeParams('c1'))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/no fields/i)
  })

  it('returns 404 when coupon not found', async () => {
    mockCouponUpdate.mockResolvedValue(null)
    const res = await PATCH1(makeReq('PATCH', { isActive: false }), makeParams('ghost'))
    expect(res.status).toBe(404)
  })

  it('updates isActive flag', async () => {
    mockCouponUpdate.mockResolvedValue({ id: 'c1', code: 'TEST', isActive: false })
    const res  = await PATCH1(makeReq('PATCH', { isActive: false }), makeParams('c1'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.coupon.isActive).toBe(false)
  })

  it('sets validUntil to null when passed null', async () => {
    mockCouponUpdate.mockResolvedValue({ id: 'c1', code: 'X', isActive: true })
    await PATCH1(makeReq('PATCH', { validUntil: null }), makeParams('c1'))
    expect(mockCouponUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ validUntil: null }) })
    )
  })

  it('sets usageLimit to null when passed null', async () => {
    mockCouponUpdate.mockResolvedValue({ id: 'c1', code: 'X', isActive: true })
    await PATCH1(makeReq('PATCH', { usageLimit: null }), makeParams('c1'))
    expect(mockCouponUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ usageLimit: null }) })
    )
  })
})

// ─── DELETE /api/admin/coupons/[couponId] ────────────────────────────────────

describe('DELETE /api/admin/coupons/[couponId]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED)
    const res = await DEL1(makeReq('DELETE'), makeParams('c1'))
    expect(res.status).toBe(401)
  })

  it('deletes coupon and returns ok:true', async () => {
    mockCouponDelete.mockResolvedValue({ id: 'c1' })
    const res  = await DEL1(makeReq('DELETE'), makeParams('c1'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })

  it('still returns ok:true if coupon already gone', async () => {
    mockCouponDelete.mockRejectedValue(new Error('not found'))
    const res  = await DEL1(makeReq('DELETE'), makeParams('ghost'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })
})
