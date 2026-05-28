/**
 * Unit tests for /api/admin/bundles/* routes.
 *
 * Covers:
 *   GET    /api/admin/bundles                    — list
 *   POST   /api/admin/bundles                    — create
 *   GET    /api/admin/bundles/[bundleId]         — detail
 *   PATCH  /api/admin/bundles/[bundleId]         — update
 *   DELETE /api/admin/bundles/[bundleId]         — delete
 *   POST   /api/admin/bundles/[bundleId]/items   — add item
 *   DELETE /api/admin/bundles/[bundleId]/items   — remove item
 */

import { NextRequest } from 'next/server'

/* ─── mock: adminGuard ───────────────────────────────────────────────────── */
const mockRequireAdminSession = jest.fn()

jest.mock('@/lib/adminGuard', () => ({
  requireAdminSession: (...a: unknown[]) => mockRequireAdminSession(...a),
}))

/* ─── mock: Prisma ───────────────────────────────────────────────────────── */
const mockBundleFindMany      = jest.fn()
const mockBundleFindUnique    = jest.fn()
const mockBundleCreate        = jest.fn()
const mockBundleUpdate        = jest.fn()
const mockBundleDelete        = jest.fn()
const mockBundleItemUpsert    = jest.fn()
const mockBundleItemDeleteMany = jest.fn()
const mockProductFindUnique   = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    bundle: {
      findMany:   (...a: unknown[]) => mockBundleFindMany(...a),
      findUnique: (...a: unknown[]) => mockBundleFindUnique(...a),
      create:     (...a: unknown[]) => mockBundleCreate(...a),
      update:     (...a: unknown[]) => mockBundleUpdate(...a),
      delete:     (...a: unknown[]) => mockBundleDelete(...a),
    },
    bundleItem: {
      upsert:     (...a: unknown[]) => mockBundleItemUpsert(...a),
      deleteMany: (...a: unknown[]) => mockBundleItemDeleteMany(...a),
    },
    product: {
      findUnique: (...a: unknown[]) => mockProductFindUnique(...a),
    },
  },
}))

/* ─── mock: slugify ──────────────────────────────────────────────────────── */
const mockSlugify = jest.fn((s: string) => s.toLowerCase().replace(/\s+/g, '-'))

jest.mock('@/lib/utils', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slugify: (s: any) => mockSlugify(s),
}))

/* ─── shared ─────────────────────────────────────────────────────────────── */
const ADMIN_SESSION = {
  session: { user: { id: 'admin-1', role: 'ADMIN', email: 'admin@example.com' } },
  error: null,
}

const UNAUTHED = {
  session: null,
  error:   new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}

function makeReq(method: string, body?: unknown, url = 'http://localhost/api/admin/bundles'): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

beforeEach(() => {
  jest.resetAllMocks()
  mockRequireAdminSession.mockResolvedValue(ADMIN_SESSION)
  mockSlugify.mockImplementation((s: string) => s.toLowerCase().replace(/\s+/g, '-'))
})

/* ══════════════════════════════════════════════════════════════════════════
   GET /api/admin/bundles
══════════════════════════════════════════════════════════════════════════ */
describe('GET /api/admin/bundles', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GET: (req: NextRequest) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/bundles/route')
    GET = mod.GET
  })

  it('returns 401 when admin guard fails', async () => {
    mockRequireAdminSession.mockResolvedValueOnce(UNAUTHED)
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(401)
  })

  it('returns list of bundles', async () => {
    const bundles = [
      { id: 'b1', slug: 'bundle-one', titleEn: 'Bundle One', titleAr: 'باقة', price: '29.99', isPublished: true, _count: { items: 3 } },
    ]
    mockBundleFindMany.mockResolvedValue(bundles)
    const res  = await GET(makeReq('GET'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.bundles).toEqual(bundles)
    expect(mockBundleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    )
  })

  it('returns empty array when DB throws', async () => {
    mockBundleFindMany.mockRejectedValue(new Error('db error'))
    const res  = await GET(makeReq('GET'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.bundles).toEqual([])
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   POST /api/admin/bundles
══════════════════════════════════════════════════════════════════════════ */
describe('POST /api/admin/bundles', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: (req: NextRequest) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/bundles/route')
    POST = mod.POST
  })

  const valid = {
    titleEn:       'Test Bundle',
    titleAr:       'باقة تجريبية',
    descriptionEn: 'A test bundle',
    descriptionAr: 'وصف تجريبي',
    price:         '19.99',
  }

  it('returns 401 when admin guard fails', async () => {
    mockRequireAdminSession.mockResolvedValueOnce(UNAUTHED)
    const res = await POST(makeReq('POST', valid))
    expect(res.status).toBe(401)
  })

  it('returns 400 if titleEn is missing', async () => {
    const res = await POST(makeReq('POST', { ...valid, titleEn: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 if titleAr is missing', async () => {
    const res = await POST(makeReq('POST', { ...valid, titleAr: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 if descriptionEn is missing', async () => {
    const res = await POST(makeReq('POST', { ...valid, descriptionEn: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 if descriptionAr is missing', async () => {
    const res = await POST(makeReq('POST', { ...valid, descriptionAr: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 if price is negative', async () => {
    const res = await POST(makeReq('POST', { ...valid, price: '-5' }))
    expect(res.status).toBe(400)
  })

  it('returns 409 if slug already exists', async () => {
    mockSlugify.mockReturnValue('test-bundle')
    mockBundleFindUnique.mockResolvedValue({ id: 'existing' })
    const res = await POST(makeReq('POST', valid))
    expect(res.status).toBe(409)
  })

  it('creates bundle and returns 201 with id + slug', async () => {
    mockSlugify.mockReturnValue('test-bundle')
    mockBundleFindUnique.mockResolvedValue(null)
    mockBundleCreate.mockResolvedValue({ id: 'new-bundle', slug: 'test-bundle' })

    const res  = await POST(makeReq('POST', valid))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.bundle).toEqual({ id: 'new-bundle', slug: 'test-bundle' })
    expect(mockBundleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug:    'test-bundle',
          titleEn: 'Test Bundle',
          price:   19.99,
        }),
      }),
    )
  })

  it('uses fallback slug when slugify returns empty', async () => {
    mockSlugify.mockReturnValue('')
    mockBundleFindUnique.mockResolvedValue(null)
    mockBundleCreate.mockResolvedValue({ id: 'b2', slug: 'bundle-fallback' })

    const res = await POST(makeReq('POST', valid))
    expect(res.status).toBe(201)
    const createArg = mockBundleCreate.mock.calls[0][0]
    expect(createArg.data.slug).toMatch(/^bundle-/)
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   GET /api/admin/bundles/[bundleId]
══════════════════════════════════════════════════════════════════════════ */
describe('GET /api/admin/bundles/[bundleId]', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GET: (req: NextRequest, ctx: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/bundles/[bundleId]/route')
    GET = mod.GET
  })

  it('returns 401 when admin guard fails', async () => {
    mockRequireAdminSession.mockResolvedValueOnce(UNAUTHED)
    const res = await GET(makeReq('GET'), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when bundle not found', async () => {
    mockBundleFindUnique.mockResolvedValue(null)
    const res = await GET(makeReq('GET'), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns bundle with items', async () => {
    const bundle = {
      id: 'bundle-1', slug: 'b1', titleEn: 'B1', titleAr: 'ب1',
      items: [{ id: 'item-1', product: { id: 'p1', titleEn: 'P1', titleAr: 'م1', coverImage: null, price: '9.99' } }],
    }
    mockBundleFindUnique.mockResolvedValue(bundle)
    const res  = await GET(makeReq('GET'), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.bundle).toEqual(bundle)
    expect(mockBundleFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'bundle-1' } }),
    )
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   PATCH /api/admin/bundles/[bundleId]
══════════════════════════════════════════════════════════════════════════ */
describe('PATCH /api/admin/bundles/[bundleId]', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PATCH: (req: NextRequest, ctx: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/bundles/[bundleId]/route')
    PATCH = mod.PATCH
  })

  it('returns 401 when admin guard fails', async () => {
    mockRequireAdminSession.mockResolvedValueOnce(UNAUTHED)
    const res = await PATCH(makeReq('PATCH', {}), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when body has no updatable fields', async () => {
    const res = await PATCH(makeReq('PATCH', {}), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    expect(res.status).toBe(400)
  })

  it('updates provided fields and returns bundle', async () => {
    const updated = { id: 'bundle-1', slug: 'b1', isPublished: false }
    mockBundleUpdate.mockResolvedValue(updated)

    const res  = await PATCH(makeReq('PATCH', { titleEn: 'New Title' }), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.bundle).toEqual(updated)
    expect(mockBundleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bundle-1' },
        data:  expect.objectContaining({ titleEn: 'New Title' }),
      }),
    )
  })

  it('converts price string to float', async () => {
    mockBundleUpdate.mockResolvedValue({ id: 'bundle-1', slug: 'b1', isPublished: false })
    await PATCH(makeReq('PATCH', { price: '24.99' }), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    const data = mockBundleUpdate.mock.calls[0][0].data
    expect(data.price).toBe(24.99)
  })

  it('toggles isPublished', async () => {
    mockBundleUpdate.mockResolvedValue({ id: 'bundle-1', slug: 'b1', isPublished: true })
    await PATCH(makeReq('PATCH', { isPublished: true }), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    const data = mockBundleUpdate.mock.calls[0][0].data
    expect(data.isPublished).toBe(true)
  })

  it('returns 404 when bundle does not exist', async () => {
    mockBundleUpdate.mockResolvedValue(null)
    const res = await PATCH(makeReq('PATCH', { titleEn: 'X' }), { params: Promise.resolve({ bundleId: 'ghost' }) })
    expect(res.status).toBe(404)
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   DELETE /api/admin/bundles/[bundleId]
══════════════════════════════════════════════════════════════════════════ */
describe('DELETE /api/admin/bundles/[bundleId]', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let DELETE: (req: NextRequest, ctx: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/bundles/[bundleId]/route')
    DELETE = mod.DELETE
  })

  it('returns 401 when admin guard fails', async () => {
    mockRequireAdminSession.mockResolvedValueOnce(UNAUTHED)
    const res = await DELETE(makeReq('DELETE'), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    expect(res.status).toBe(401)
  })

  it('deletes bundle and returns { ok: true }', async () => {
    mockBundleDelete.mockResolvedValue({})
    const res  = await DELETE(makeReq('DELETE'), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(mockBundleDelete).toHaveBeenCalledWith({ where: { id: 'bundle-1' } })
  })

  it('still returns { ok: true } when delete throws', async () => {
    mockBundleDelete.mockRejectedValue(new Error('constraint'))
    const res  = await DELETE(makeReq('DELETE'), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   POST /api/admin/bundles/[bundleId]/items
══════════════════════════════════════════════════════════════════════════ */
describe('POST /api/admin/bundles/[bundleId]/items', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: (req: NextRequest, ctx: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/bundles/[bundleId]/items/route')
    POST = mod.POST
  })

  it('returns 401 when admin guard fails', async () => {
    mockRequireAdminSession.mockResolvedValueOnce(UNAUTHED)
    const res = await POST(makeReq('POST', { productId: 'p1' }), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 400 if productId is missing', async () => {
    const res = await POST(makeReq('POST', {}), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 404 if bundle not found', async () => {
    mockBundleFindUnique.mockResolvedValue(null)
    mockProductFindUnique.mockResolvedValue({ id: 'p1' })
    const res = await POST(makeReq('POST', { productId: 'p1' }), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 404 if product not found', async () => {
    mockBundleFindUnique.mockResolvedValue({ id: 'bundle-1' })
    mockProductFindUnique.mockResolvedValue(null)
    const res = await POST(makeReq('POST', { productId: 'p1' }), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    expect(res.status).toBe(404)
  })

  it('upserts bundle item and returns 201', async () => {
    mockBundleFindUnique.mockResolvedValue({ id: 'bundle-1' })
    mockProductFindUnique.mockResolvedValue({ id: 'p1' })
    const newItem = { id: 'item-1', bundleId: 'bundle-1', productId: 'p1' }
    mockBundleItemUpsert.mockResolvedValue(newItem)

    const res  = await POST(makeReq('POST', { productId: 'p1' }), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.item).toEqual(newItem)
    expect(mockBundleItemUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { bundleId_productId: { bundleId: 'bundle-1', productId: 'p1' } },
        create: { bundleId: 'bundle-1', productId: 'p1' },
        update: {},
      }),
    )
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   DELETE /api/admin/bundles/[bundleId]/items
══════════════════════════════════════════════════════════════════════════ */
describe('DELETE /api/admin/bundles/[bundleId]/items', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let DELETE: (req: NextRequest, ctx: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/bundles/[bundleId]/items/route')
    DELETE = mod.DELETE
  })

  it('returns 401 when admin guard fails', async () => {
    mockRequireAdminSession.mockResolvedValueOnce(UNAUTHED)
    const res = await DELETE(makeReq('DELETE', { productId: 'p1' }), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 400 if productId is missing', async () => {
    const res = await DELETE(makeReq('DELETE', {}), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    expect(res.status).toBe(400)
  })

  it('deletes bundle item and returns { ok: true }', async () => {
    mockBundleItemDeleteMany.mockResolvedValue({ count: 1 })
    const res  = await DELETE(makeReq('DELETE', { productId: 'p1' }), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(mockBundleItemDeleteMany).toHaveBeenCalledWith({
      where: { bundleId: 'bundle-1', productId: 'p1' },
    })
  })

  it('returns { ok: true } even if no rows deleted', async () => {
    mockBundleItemDeleteMany.mockResolvedValue({ count: 0 })
    const res  = await DELETE(makeReq('DELETE', { productId: 'p1' }), { params: Promise.resolve({ bundleId: 'bundle-1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })
})
