/**
 * Unit tests for the Wishlist API.
 *
 * Covers:
 *   GET  /api/wishlist  — 401, returns items list
 *   POST /api/wishlist  — 401, missing body, both ids, add course, add product
 *   DELETE /api/wishlist — 401, missing body, remove course, remove product
 */

import { NextRequest } from 'next/server'

/* ─── mock: next-auth ────────────────────────────────────────────────────── */
const mockGetServerSession = jest.fn()
jest.mock('next-auth', () => ({
  getServerSession: (...a: unknown[]) => mockGetServerSession(...a),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

/* ─── mock: Prisma ───────────────────────────────────────────────────────── */
const mockWishlistFindMany  = jest.fn()
const mockWishlistUpsert    = jest.fn()
const mockWishlistDeleteMany = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    wishlist: {
      findMany:   (...a: unknown[]) => mockWishlistFindMany(...a),
      upsert:     (...a: unknown[]) => mockWishlistUpsert(...a),
      deleteMany: (...a: unknown[]) => mockWishlistDeleteMany(...a),
    },
  },
}))

/* ─── helpers ────────────────────────────────────────────────────────────── */
const AUTH_SESSION   = { user: { id: 'user-1' } }
const UNAUTHED: null = null

function makeReq(body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/wishlist', {
    method:  'POST',
    body:    JSON.stringify(body ?? {}),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeDeleteReq(body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/wishlist', {
    method:  'DELETE',
    body:    JSON.stringify(body ?? {}),
    headers: { 'Content-Type': 'application/json' },
  })
}

/* ─── dynamic imports ────────────────────────────────────────────────────── */
let GET:    () => Promise<Response>
let POST:   (req: NextRequest) => Promise<Response>
let DELETE: (req: NextRequest) => Promise<Response>

beforeAll(async () => {
  const route = await import('@/app/api/wishlist/route')
  GET    = route.GET
  POST   = route.POST
  DELETE = route.DELETE
})

beforeEach(() => {
  jest.clearAllMocks()
  mockGetServerSession.mockResolvedValue(AUTH_SESSION)
})

// ─── GET ──────────────────────────────────────────────────────────────────────

describe('GET /api/wishlist', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(UNAUTHED)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns items array for authenticated user', async () => {
    const mockItems = [
      { id: 'w1', courseId: 'c1', productId: null, createdAt: new Date(), course: { id: 'c1', slug: 'parenting-101', titleEn: 'Parenting 101', titleAr: 'تربية', shortDescEn: null, shortDescAr: null, thumbnail: null, price: 49, isMemberOnly: false }, product: null },
    ]
    mockWishlistFindMany.mockResolvedValue(mockItems)
    const res  = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.items).toHaveLength(1)
    expect(json.items[0].courseId).toBe('c1')
  })

  it('returns empty items array when wishlist is empty', async () => {
    mockWishlistFindMany.mockResolvedValue([])
    const res  = await GET()
    const json = await res.json()
    expect(json.items).toEqual([])
  })

  it('orders by createdAt desc', async () => {
    mockWishlistFindMany.mockResolvedValue([])
    await GET()
    expect(mockWishlistFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    )
  })
})

// ─── POST ─────────────────────────────────────────────────────────────────────

describe('POST /api/wishlist', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(UNAUTHED)
    const res = await POST(makeReq({ courseId: 'c1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when neither courseId nor productId is provided', async () => {
    const res  = await POST(makeReq({}))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/courseId or productId/i)
  })

  it('returns 400 when both courseId and productId are provided', async () => {
    const res  = await POST(makeReq({ courseId: 'c1', productId: 'p1' }))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/not both/i)
  })

  it('upserts with courseId and returns 201', async () => {
    const entry = { id: 'w1', userId: 'user-1', courseId: 'c1', productId: null, createdAt: new Date() }
    mockWishlistUpsert.mockResolvedValue(entry)
    const res = await POST(makeReq({ courseId: 'c1' }))
    expect(res.status).toBe(201)
    expect(mockWishlistUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { userId_courseId: { userId: 'user-1', courseId: 'c1' } },
        create: { userId: 'user-1', courseId: 'c1' },
      }),
    )
  })

  it('upserts with productId and returns 201', async () => {
    const entry = { id: 'w2', userId: 'user-1', courseId: null, productId: 'p1', createdAt: new Date() }
    mockWishlistUpsert.mockResolvedValue(entry)
    const res = await POST(makeReq({ productId: 'p1' }))
    expect(res.status).toBe(201)
    expect(mockWishlistUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { userId_productId: { userId: 'user-1', productId: 'p1' } },
        create: { userId: 'user-1', productId: 'p1' },
      }),
    )
  })

  it('is idempotent — upsert with update: {}', async () => {
    mockWishlistUpsert.mockResolvedValue({ id: 'w1' })
    await POST(makeReq({ courseId: 'c1' }))
    expect(mockWishlistUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: {} }),
    )
  })
})

// ─── DELETE ───────────────────────────────────────────────────────────────────

describe('DELETE /api/wishlist', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(UNAUTHED)
    const res = await DELETE(makeDeleteReq({ courseId: 'c1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when no id provided', async () => {
    const res  = await DELETE(makeDeleteReq({}))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/courseId or productId/i)
  })

  it('removes course from wishlist', async () => {
    mockWishlistDeleteMany.mockResolvedValue({ count: 1 })
    const res  = await DELETE(makeDeleteReq({ courseId: 'c1' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(mockWishlistDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', courseId: 'c1' },
    })
  })

  it('removes product from wishlist', async () => {
    mockWishlistDeleteMany.mockResolvedValue({ count: 1 })
    const res  = await DELETE(makeDeleteReq({ productId: 'p1' }))
    expect(res.status).toBe(200)
    expect(mockWishlistDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', productId: 'p1' },
    })
  })

  it('is idempotent — deleteMany on already-removed item returns 200', async () => {
    mockWishlistDeleteMany.mockResolvedValue({ count: 0 }) // nothing deleted
    const res = await DELETE(makeDeleteReq({ courseId: 'nonexistent' }))
    expect(res.status).toBe(200)
  })
})
