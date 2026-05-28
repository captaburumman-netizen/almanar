/**
 * Unit tests for the reviews & ratings system.
 *
 * Covers:
 *   GET  /api/reviews         — list approved reviews
 *   POST /api/reviews         — submit / update review
 *   GET  /api/admin/reviews   — admin paginated list
 *   PATCH  /api/admin/reviews/[reviewId] — approve / reject
 *   DELETE /api/admin/reviews/[reviewId] — delete
 */

import { NextRequest } from 'next/server'

/* ─── mock: next-auth ────────────────────────────────────────────────────── */
const mockGetServerSession = jest.fn()
jest.mock('next-auth', () => ({ getServerSession: (...a: unknown[]) => mockGetServerSession(...a) }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

/* ─── mock: adminGuard ───────────────────────────────────────────────────── */
const mockRequireAdminSession = jest.fn()
jest.mock('@/lib/adminGuard', () => ({
  requireAdminSession: (...a: unknown[]) => mockRequireAdminSession(...a),
}))

/* ─── mock: Prisma ───────────────────────────────────────────────────────── */
const mockReviewFindMany    = jest.fn()
const mockReviewCount       = jest.fn()
const mockReviewFindUnique  = jest.fn()
const mockReviewCreate      = jest.fn()
const mockReviewUpdate      = jest.fn()
const mockReviewDelete      = jest.fn()
const mockReviewDeleteMany  = jest.fn()
const mockEnrollmentFindUnique     = jest.fn()
const mockProductPurchaseFindFirst = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    review: {
      findMany:    (...a: unknown[]) => mockReviewFindMany(...a),
      count:       (...a: unknown[]) => mockReviewCount(...a),
      findUnique:  (...a: unknown[]) => mockReviewFindUnique(...a),
      create:      (...a: unknown[]) => mockReviewCreate(...a),
      update:      (...a: unknown[]) => mockReviewUpdate(...a),
      delete:      (...a: unknown[]) => mockReviewDelete(...a),
      deleteMany:  (...a: unknown[]) => mockReviewDeleteMany(...a),
    },
    enrollment:      { findUnique: (...a: unknown[]) => mockEnrollmentFindUnique(...a) },
    productPurchase: { findFirst:  (...a: unknown[]) => mockProductPurchaseFindFirst(...a) },
  },
}))

/* ─── helpers ────────────────────────────────────────────────────────────── */
const AUTH_SESSION  = { user: { id: 'user-1', name: 'Test User' } }
const ADMIN_SESSION = { session: { user: { id: 'admin-1', role: 'ADMIN' } }, error: null }
const UNAUTHED_ADMIN = { session: null, error: new Response('{}', { status: 401 }) }

function makeReq(method = 'GET', url = 'http://localhost/api/reviews', body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    ...(body
      ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }
      : {}),
  })
}

function makeParams(reviewId: string) {
  return { params: Promise.resolve({ reviewId }) }
}

function makeIdParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

/* ─── dynamic imports ────────────────────────────────────────────────────── */
let GET_PUBLIC:  (req: NextRequest) => Promise<any>
let POST_PUBLIC: (req: NextRequest) => Promise<any>
let DEL_USER:    (req: NextRequest, ctx: any) => Promise<any>
let GET_ADMIN:   (req: NextRequest) => Promise<any>
let PATCH_ADMIN: (req: NextRequest, ctx: any) => Promise<any>
let DEL_ADMIN:   (req: NextRequest, ctx: any) => Promise<any>

beforeAll(async () => {
  const publicRoute  = await import('@/app/api/reviews/route')
  const userIdRoute  = await import('@/app/api/reviews/[id]/route')
  const adminList    = await import('@/app/api/admin/reviews/route')
  const adminDetail  = await import('@/app/api/admin/reviews/[reviewId]/route')
  GET_PUBLIC  = publicRoute.GET
  POST_PUBLIC = publicRoute.POST
  DEL_USER    = userIdRoute.DELETE
  GET_ADMIN   = adminList.GET
  PATCH_ADMIN = adminDetail.PATCH
  DEL_ADMIN   = adminDetail.DELETE
})

beforeEach(() => {
  jest.clearAllMocks()
  mockGetServerSession.mockResolvedValue(AUTH_SESSION)
  mockRequireAdminSession.mockResolvedValue(ADMIN_SESSION)
})

// ─── GET /api/reviews ─────────────────────────────────────────────────────────

describe('GET /api/reviews', () => {
  it('returns 400 when neither courseId nor productId given', async () => {
    const res = await GET_PUBLIC(makeReq('GET', 'http://localhost/api/reviews'))
    expect(res.status).toBe(400)
  })

  it('returns approved reviews + stats for a course', async () => {
    const reviews = [
      { id: 'r1', rating: 5, comment: 'Great!', createdAt: new Date(), user: { name: 'Alice' } },
      { id: 'r2', rating: 3, comment: null,      createdAt: new Date(), user: { name: 'Bob'   } },
    ]
    mockReviewFindMany.mockResolvedValue(reviews)
    const res  = await GET_PUBLIC(makeReq('GET', 'http://localhost/api/reviews?courseId=c1'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.reviews).toHaveLength(2)
    expect(json.total).toBe(2)
    expect(json.avgRating).toBe(4.0)
  })

  it('returns null avgRating when no reviews', async () => {
    mockReviewFindMany.mockResolvedValue([])
    const res  = await GET_PUBLIC(makeReq('GET', 'http://localhost/api/reviews?productId=p1'))
    const json = await res.json()
    expect(json.avgRating).toBeNull()
    expect(json.total).toBe(0)
  })
})

// ─── POST /api/reviews ────────────────────────────────────────────────────────

describe('POST /api/reviews', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST_PUBLIC(makeReq('POST', 'http://localhost/api/reviews', { courseId: 'c1', rating: 5 }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when no courseId or productId', async () => {
    const res = await POST_PUBLIC(makeReq('POST', 'http://localhost/api/reviews', { rating: 4 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when both courseId and productId given', async () => {
    const res = await POST_PUBLIC(makeReq('POST', 'http://localhost/api/reviews', {
      courseId: 'c1', productId: 'p1', rating: 4,
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when rating is out of range', async () => {
    const res = await POST_PUBLIC(makeReq('POST', 'http://localhost/api/reviews', { courseId: 'c1', rating: 6 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when rating is missing', async () => {
    const res = await POST_PUBLIC(makeReq('POST', 'http://localhost/api/reviews', { courseId: 'c1' }))
    expect(res.status).toBe(400)
  })

  it('returns 403 when user not enrolled in course', async () => {
    mockEnrollmentFindUnique.mockResolvedValue(null)
    const res = await POST_PUBLIC(makeReq('POST', 'http://localhost/api/reviews', { courseId: 'c1', rating: 4 }))
    expect(res.status).toBe(403)
  })

  it('returns 403 when user has not purchased product', async () => {
    mockProductPurchaseFindFirst.mockResolvedValue(null)
    const res = await POST_PUBLIC(makeReq('POST', 'http://localhost/api/reviews', { productId: 'p1', rating: 3 }))
    expect(res.status).toBe(403)
  })

  it('creates a new course review and returns 201', async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ id: 'e1' })
    mockReviewFindUnique.mockResolvedValue(null) // no existing review
    mockReviewCreate.mockResolvedValue({ id: 'new-review' })
    const res  = await POST_PUBLIC(makeReq('POST', 'http://localhost/api/reviews', { courseId: 'c1', rating: 5, comment: 'Excellent' }))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.review.id).toBe('new-review')
  })

  it('updates existing review and resets to PENDING', async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ id: 'e1' })
    mockReviewFindUnique.mockResolvedValue({ id: 'existing-r' })
    mockReviewUpdate.mockResolvedValue({ id: 'existing-r' })
    const res = await POST_PUBLIC(makeReq('POST', 'http://localhost/api/reviews', { courseId: 'c1', rating: 4 }))
    expect(res.status).toBe(201)
    expect(mockReviewUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING' }) })
    )
  })

  it('creates a new product review and returns 201', async () => {
    mockProductPurchaseFindFirst.mockResolvedValue({ id: 'pp1' })
    mockReviewFindUnique.mockResolvedValue(null)
    mockReviewCreate.mockResolvedValue({ id: 'prod-review' })
    const res  = await POST_PUBLIC(makeReq('POST', 'http://localhost/api/reviews', { productId: 'p1', rating: 4 }))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.review.id).toBe('prod-review')
  })
})

// ─── GET /api/admin/reviews ───────────────────────────────────────────────────

describe('GET /api/admin/reviews', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED_ADMIN)
    const res = await GET_ADMIN(makeReq('GET', 'http://localhost/api/admin/reviews'))
    expect(res.status).toBe(401)
  })

  it('returns paginated reviews with total', async () => {
    mockReviewFindMany.mockResolvedValue([{ id: 'r1', rating: 5, status: 'PENDING' }])
    mockReviewCount.mockResolvedValue(1)
    const res  = await GET_ADMIN(makeReq('GET', 'http://localhost/api/admin/reviews'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.reviews).toHaveLength(1)
    expect(json.pagination.total).toBe(1)
  })

  it('filters by status', async () => {
    mockReviewFindMany.mockResolvedValue([])
    mockReviewCount.mockResolvedValue(0)
    await GET_ADMIN(makeReq('GET', 'http://localhost/api/admin/reviews?status=APPROVED'))
    expect(mockReviewFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'APPROVED' } })
    )
  })
})

// ─── PATCH /api/admin/reviews/[reviewId] ─────────────────────────────────────

describe('PATCH /api/admin/reviews/[reviewId]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED_ADMIN)
    const res = await PATCH_ADMIN(makeReq('PATCH', 'http://localhost/api/admin/reviews/r1', { status: 'APPROVED' }), makeParams('r1'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when status is invalid', async () => {
    const res  = await PATCH_ADMIN(makeReq('PATCH', 'http://localhost/api/admin/reviews/r1', { status: 'BOGUS' }), makeParams('r1'))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/APPROVED|REJECTED/i)
  })

  it('returns 404 when review not found', async () => {
    mockReviewUpdate.mockResolvedValue(null)
    const res = await PATCH_ADMIN(makeReq('PATCH', 'http://localhost/api/admin/reviews/ghost', { status: 'APPROVED' }), makeParams('ghost'))
    expect(res.status).toBe(404)
  })

  it('approves a review', async () => {
    mockReviewUpdate.mockResolvedValue({ id: 'r1', status: 'APPROVED' })
    const res  = await PATCH_ADMIN(makeReq('PATCH', 'http://localhost/api/admin/reviews/r1', { status: 'APPROVED' }), makeParams('r1'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.review.status).toBe('APPROVED')
  })

  it('rejects a review', async () => {
    mockReviewUpdate.mockResolvedValue({ id: 'r1', status: 'REJECTED' })
    const res  = await PATCH_ADMIN(makeReq('PATCH', 'http://localhost/api/admin/reviews/r1', { status: 'REJECTED' }), makeParams('r1'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.review.status).toBe('REJECTED')
  })
})

// ─── DELETE /api/admin/reviews/[reviewId] ────────────────────────────────────

describe('DELETE /api/admin/reviews/[reviewId]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED_ADMIN)
    const res = await DEL_ADMIN(makeReq('DELETE'), makeParams('r1'))
    expect(res.status).toBe(401)
  })

  it('deletes review and returns ok:true', async () => {
    mockReviewDelete.mockResolvedValue({ id: 'r1' })
    const res  = await DEL_ADMIN(makeReq('DELETE'), makeParams('r1'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })

  it('still returns ok:true if review already gone', async () => {
    mockReviewDelete.mockRejectedValue(new Error('not found'))
    const res  = await DEL_ADMIN(makeReq('DELETE'), makeParams('ghost'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })
})

// ─── DELETE /api/reviews/[id] (user deletes own) ──────────────────────────────

describe('DELETE /api/reviews/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await DEL_USER(
      makeReq('DELETE', 'http://localhost/api/reviews/r1'),
      makeIdParams('r1'),
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 when review not found or not owned', async () => {
    mockReviewDeleteMany.mockResolvedValue({ count: 0 })
    const res = await DEL_USER(
      makeReq('DELETE', 'http://localhost/api/reviews/ghost'),
      makeIdParams('ghost'),
    )
    expect(res.status).toBe(404)
  })

  it('deletes own review and returns ok:true', async () => {
    mockReviewDeleteMany.mockResolvedValue({ count: 1 })
    const res  = await DEL_USER(
      makeReq('DELETE', 'http://localhost/api/reviews/r1'),
      makeIdParams('r1'),
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(mockReviewDeleteMany).toHaveBeenCalledWith({
      where: { id: 'r1', userId: 'user-1' },
    })
  })
})
