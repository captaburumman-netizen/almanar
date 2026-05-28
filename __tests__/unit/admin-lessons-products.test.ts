/**
 * Unit tests — Admin Lessons + Admin Products
 *
 * Lessons:
 *   POST  /api/admin/courses/[courseId]/lessons            — create lesson
 *   PATCH /api/admin/courses/[courseId]/lessons/[lessonId] — update lesson
 *   DELETE /api/admin/courses/[courseId]/lessons/[lessonId]— delete lesson
 *   PATCH /api/admin/courses/[courseId]/lessons/reorder    — reorder lessons
 *
 * Products:
 *   GET   /api/admin/products                 — list all products
 *   POST  /api/admin/products                 — create product
 *   GET   /api/admin/products/[productId]     — fetch product
 *   PATCH /api/admin/products/[productId]     — update product
 *   DELETE /api/admin/products/[productId]    — delete product
 */

import { NextRequest } from 'next/server'

// ─── Mock: adminGuard ─────────────────────────────────────────────────────────

const mockRequireAdminSession = jest.fn()

jest.mock('@/lib/adminGuard', () => ({
  requireAdminSession: (...a: unknown[]) => mockRequireAdminSession(...a),
}))

// ─── Mock: Prisma ─────────────────────────────────────────────────────────────

const mockCourseFindUnique   = jest.fn()
const mockLessonFindFirst    = jest.fn()
const mockLessonCreate       = jest.fn()
const mockLessonUpdate       = jest.fn()
const mockLessonUpdateMany   = jest.fn()
const mockLessonDelete       = jest.fn()
const mockProductFindMany    = jest.fn()
const mockProductFindUnique  = jest.fn()
const mockProductCreate      = jest.fn()
const mockProductUpdate      = jest.fn()
const mockProductDelete      = jest.fn()
const mockTransaction        = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    course:   { findUnique: (...a: unknown[]) => mockCourseFindUnique(...a) },
    lesson: {
      findFirst:  (...a: unknown[]) => mockLessonFindFirst(...a),
      create:     (...a: unknown[]) => mockLessonCreate(...a),
      update:     (...a: unknown[]) => mockLessonUpdate(...a),
      updateMany: (...a: unknown[]) => mockLessonUpdateMany(...a),
      delete:     (...a: unknown[]) => mockLessonDelete(...a),
    },
    product: {
      findMany:   (...a: unknown[]) => mockProductFindMany(...a),
      findUnique: (...a: unknown[]) => mockProductFindUnique(...a),
      create:     (...a: unknown[]) => mockProductCreate(...a),
      update:     (...a: unknown[]) => mockProductUpdate(...a),
      delete:     (...a: unknown[]) => mockProductDelete(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}))

// ─── Mock: utils (slugify) ────────────────────────────────────────────────────

jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  slugify: (s: string) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ADMIN_OK = { session: { user: { id: 'admin-1' } }, error: null }
const UNAUTHED = {
  session: null,
  error:   new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}

function makeReq(url: string, method: string, body?: unknown): NextRequest {
  const hasBody = method !== 'GET' && method !== 'HEAD'
  return new NextRequest(url, {
    method,
    headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
    body:    hasBody ? JSON.stringify(body ?? {}) : undefined,
  })
}

function makeParams<T extends Record<string, string>>(p: T) {
  return { params: Promise.resolve(p) }
}

// ─── Dynamic imports ──────────────────────────────────────────────────────────

let createLesson:   (req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) => Promise<Response>
let updateLesson:   (req: NextRequest, ctx: { params: Promise<{ courseId: string; lessonId: string }> }) => Promise<Response>
let deleteLesson:   (req: NextRequest, ctx: { params: Promise<{ courseId: string; lessonId: string }> }) => Promise<Response>
let reorderLessons: (req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) => Promise<Response>
let listProducts:   () => Promise<Response>
let createProduct:  (req: NextRequest) => Promise<Response>
let getProduct:     (req: NextRequest, ctx: { params: Promise<{ productId: string }> }) => Promise<Response>
let updateProduct:  (req: NextRequest, ctx: { params: Promise<{ productId: string }> }) => Promise<Response>
let deleteProduct:  (req: NextRequest, ctx: { params: Promise<{ productId: string }> }) => Promise<Response>

beforeAll(async () => {
  const lessonsRoute  = await import('@/app/api/admin/courses/[courseId]/lessons/route')
  const lessonRoute   = await import('@/app/api/admin/courses/[courseId]/lessons/[lessonId]/route')
  const reorderRoute  = await import('@/app/api/admin/courses/[courseId]/lessons/reorder/route')
  const productsRoute = await import('@/app/api/admin/products/route')
  const productRoute  = await import('@/app/api/admin/products/[productId]/route')

  createLesson   = lessonsRoute.POST
  updateLesson   = lessonRoute.PATCH
  deleteLesson   = lessonRoute.DELETE
  reorderLessons = reorderRoute.PATCH
  listProducts   = productsRoute.GET
  createProduct  = productsRoute.POST
  getProduct     = productRoute.GET
  updateProduct  = productRoute.PATCH
  deleteProduct  = productRoute.DELETE
})

beforeEach(() => {
  jest.clearAllMocks()
  mockRequireAdminSession.mockResolvedValue(ADMIN_OK)
  mockCourseFindUnique.mockResolvedValue({ id: 'c1' })
  mockLessonFindFirst.mockResolvedValue(null)               // no previous lessons → position 1
  mockLessonCreate.mockResolvedValue({ id: 'l1', slug: 'intro', position: 1 })
  mockLessonUpdate.mockResolvedValue({ id: 'l1', slug: 'intro', isPublished: false })
  mockLessonDelete.mockResolvedValue({})
  mockLessonUpdateMany.mockResolvedValue({ count: 1 })
  mockTransaction.mockImplementation((ops: unknown[]) => Promise.all(ops))
  mockProductFindMany.mockResolvedValue([])
  mockProductFindUnique.mockResolvedValue(null)
  mockProductCreate.mockResolvedValue({ id: 'p1', slug: 'my-ebook' })
  mockProductUpdate.mockResolvedValue({ id: 'p1', slug: 'my-ebook', isPublished: true })
  mockProductDelete.mockResolvedValue({})
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/courses/[courseId]/lessons
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/admin/courses/[courseId]/lessons', () => {
  const VALID_BODY = { titleEn: 'Lesson 1', titleAr: 'الدرس الأول' }

  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED)
    const res = await createLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons', 'POST', VALID_BODY),
      makeParams({ courseId: 'c1' }),
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 when course not found', async () => {
    mockCourseFindUnique.mockResolvedValue(null)
    const res = await createLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons', 'POST', VALID_BODY),
      makeParams({ courseId: 'c1' }),
    )
    expect(res.status).toBe(404)
  })

  it('returns 400 when titleEn is missing', async () => {
    const res = await createLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons', 'POST', { titleAr: 'درس' }),
      makeParams({ courseId: 'c1' }),
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when titleAr is missing', async () => {
    const res = await createLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons', 'POST', { titleEn: 'Lesson' }),
      makeParams({ courseId: 'c1' }),
    )
    expect(res.status).toBe(400)
  })

  it('creates lesson and returns 201 with id + slug + position', async () => {
    const res  = await createLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons', 'POST', VALID_BODY),
      makeParams({ courseId: 'c1' }),
    )
    const json = await res.json() as { lesson: { id: string; slug: string; position: number } }
    expect(res.status).toBe(201)
    expect(json.lesson.id).toBe('l1')
    expect(json.lesson.position).toBe(1)
  })

  it('auto-assigns position 1 when course has no lessons', async () => {
    mockLessonFindFirst.mockResolvedValue(null)
    await createLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons', 'POST', VALID_BODY),
      makeParams({ courseId: 'c1' }),
    )
    expect(mockLessonCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 1 }) }),
    )
  })

  it('appends after the last existing lesson', async () => {
    mockLessonFindFirst.mockResolvedValue({ position: 4 })
    await createLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons', 'POST', VALID_BODY),
      makeParams({ courseId: 'c1' }),
    )
    expect(mockLessonCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 5 }) }),
    )
  })

  it('generates slug from titleEn when slug is omitted', async () => {
    await createLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons', 'POST', VALID_BODY),
      makeParams({ courseId: 'c1' }),
    )
    expect(mockLessonCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'lesson-1' }) }),
    )
  })

  it('uses supplied slug instead of auto-generating', async () => {
    await createLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons', 'POST', {
        ...VALID_BODY, slug: 'my-custom-slug',
      }),
      makeParams({ courseId: 'c1' }),
    )
    expect(mockLessonCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'my-custom-slug' }) }),
    )
  })

  it('stores optional s3Key and duration', async () => {
    await createLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons', 'POST', {
        ...VALID_BODY, s3Key: 'lessons/vid.mp4', duration: 300,
      }),
      makeParams({ courseId: 'c1' }),
    )
    expect(mockLessonCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ s3Key: 'lessons/vid.mp4', duration: 300 }),
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/courses/[courseId]/lessons/[lessonId]
// ═══════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/admin/courses/[courseId]/lessons/[lessonId]', () => {
  const CTX = makeParams({ courseId: 'c1', lessonId: 'l1' })

  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED)
    const res = await updateLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons/l1', 'PATCH', { isPublished: true }),
      CTX,
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when body has no updatable fields', async () => {
    const res = await updateLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons/l1', 'PATCH', {}),
      CTX,
    )
    expect(res.status).toBe(400)
  })

  it('returns 404 when lesson not found', async () => {
    mockLessonUpdate.mockResolvedValue(null)
    const res = await updateLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons/l1', 'PATCH', { isPublished: true }),
      CTX,
    )
    expect(res.status).toBe(404)
  })

  it('publishes a lesson and returns 200', async () => {
    mockLessonUpdate.mockResolvedValue({ id: 'l1', slug: 'intro', isPublished: true })
    const res  = await updateLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons/l1', 'PATCH', { isPublished: true }),
      CTX,
    )
    const json = await res.json() as { lesson: { isPublished: boolean } }
    expect(res.status).toBe(200)
    expect(json.lesson.isPublished).toBe(true)
  })

  it('updates only provided fields (partial update)', async () => {
    await updateLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons/l1', 'PATCH', { titleEn: 'New Title' }),
      CTX,
    )
    expect(mockLessonUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ titleEn: 'New Title' }),
      }),
    )
    // titleAr should NOT be in the update data (not supplied)
    const callArgs = mockLessonUpdate.mock.calls[0]![0] as { data: Record<string, unknown> }
    expect(callArgs.data).not.toHaveProperty('titleAr')
  })

  it('clears s3Key to null when empty string passed', async () => {
    await updateLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons/l1', 'PATCH', { s3Key: '' }),
      CTX,
    )
    expect(mockLessonUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ s3Key: null }) }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/admin/courses/[courseId]/lessons/[lessonId]
// ═══════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/admin/courses/[courseId]/lessons/[lessonId]', () => {
  const CTX = makeParams({ courseId: 'c1', lessonId: 'l1' })

  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED)
    const res = await deleteLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons/l1', 'DELETE'),
      CTX,
    )
    expect(res.status).toBe(401)
  })

  it('deletes lesson and returns { ok: true }', async () => {
    const res  = await deleteLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons/l1', 'DELETE'),
      CTX,
    )
    const json = await res.json() as { ok: boolean }
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(mockLessonDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'l1', courseId: 'c1' } }),
    )
  })

  it('still returns { ok: true } when lesson does not exist (delete is idempotent)', async () => {
    mockLessonDelete.mockRejectedValue(new Error('not found'))
    const res  = await deleteLesson(
      makeReq('http://localhost/api/admin/courses/c1/lessons/l1', 'DELETE'),
      CTX,
    )
    const json = await res.json() as { ok: boolean }
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/courses/[courseId]/lessons/reorder
// ═══════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/admin/courses/[courseId]/lessons/reorder', () => {
  const CTX = makeParams({ courseId: 'c1' })

  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED)
    const res = await reorderLessons(
      makeReq('http://localhost/api/admin/courses/c1/lessons/reorder', 'PATCH', { orderedIds: ['l1', 'l2'] }),
      CTX,
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when orderedIds is missing', async () => {
    const res = await reorderLessons(
      makeReq('http://localhost/api/admin/courses/c1/lessons/reorder', 'PATCH', {}),
      CTX,
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when orderedIds is an empty array', async () => {
    const res = await reorderLessons(
      makeReq('http://localhost/api/admin/courses/c1/lessons/reorder', 'PATCH', { orderedIds: [] }),
      CTX,
    )
    expect(res.status).toBe(400)
  })

  it('runs a transaction and returns { ok: true }', async () => {
    const res  = await reorderLessons(
      makeReq('http://localhost/api/admin/courses/c1/lessons/reorder', 'PATCH', {
        orderedIds: ['l3', 'l1', 'l2'],
      }),
      CTX,
    )
    const json = await res.json() as { ok: boolean }
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(mockTransaction).toHaveBeenCalledTimes(1)
  })

  it('assigns position starting at 1 in order of orderedIds', async () => {
    const orderedIds = ['l3', 'l1', 'l2']
    await reorderLessons(
      makeReq('http://localhost/api/admin/courses/c1/lessons/reorder', 'PATCH', { orderedIds }),
      CTX,
    )
    // The transaction receives an array of updateMany operations — one per id
    const ops = mockTransaction.mock.calls[0]![0] as unknown[]
    expect(ops).toHaveLength(3)
    // Each op is a resolved promise from db.lesson.updateMany — check their args
    expect(mockLessonUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'l3', courseId: 'c1' }, data: { position: 1 } }),
    )
    expect(mockLessonUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'l1', courseId: 'c1' }, data: { position: 2 } }),
    )
    expect(mockLessonUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'l2', courseId: 'c1' }, data: { position: 3 } }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/products
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/admin/products', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED)
    const res = await listProducts()
    expect(res.status).toBe(401)
  })

  it('returns products array', async () => {
    mockProductFindMany.mockResolvedValue([
      { id: 'p1', slug: 'ebook-1', titleEn: 'Ebook 1', titleAr: 'كتاب 1',
        price: 19, isFree: false, category: 'EBOOK', language: 'BILINGUAL',
        isPublished: true, coverImage: null },
    ])
    const res  = await listProducts()
    const json = await res.json() as { products: unknown[] }
    expect(res.status).toBe(200)
    expect(json.products).toHaveLength(1)
  })

  it('returns empty array when no products exist', async () => {
    mockProductFindMany.mockResolvedValue([])
    const res  = await listProducts()
    const json = await res.json() as { products: unknown[] }
    expect(json.products).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/products
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/admin/products', () => {
  const VALID_BODY = {
    titleEn:       'Parenting Guide',
    titleAr:       'دليل التربية',
    descriptionEn: 'A comprehensive guide',
    descriptionAr: 'دليل شامل',
    price:         19,
  }

  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED)
    const res = await createProduct(
      makeReq('http://localhost/api/admin/products', 'POST', VALID_BODY),
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when titleEn is missing', async () => {
    const { titleEn: _, ...rest } = VALID_BODY
    const res = await createProduct(makeReq('http://localhost/api/admin/products', 'POST', rest))
    expect(res.status).toBe(400)
  })

  it('returns 400 when titleAr is missing', async () => {
    const { titleAr: _, ...rest } = VALID_BODY
    const res = await createProduct(makeReq('http://localhost/api/admin/products', 'POST', rest))
    expect(res.status).toBe(400)
  })

  it('returns 400 when descriptionEn is missing', async () => {
    const { descriptionEn: _, ...rest } = VALID_BODY
    const res = await createProduct(makeReq('http://localhost/api/admin/products', 'POST', rest))
    expect(res.status).toBe(400)
  })

  it('returns 400 when descriptionAr is missing', async () => {
    const { descriptionAr: _, ...rest } = VALID_BODY
    const res = await createProduct(makeReq('http://localhost/api/admin/products', 'POST', rest))
    expect(res.status).toBe(400)
  })

  it('returns 409 when slug already exists', async () => {
    mockProductFindUnique.mockResolvedValue({ id: 'existing' })
    const res = await createProduct(makeReq('http://localhost/api/admin/products', 'POST', VALID_BODY))
    expect(res.status).toBe(409)
  })

  it('creates product and returns 201 with id + slug', async () => {
    mockProductFindUnique.mockResolvedValue(null)
    const res  = await createProduct(makeReq('http://localhost/api/admin/products', 'POST', VALID_BODY))
    const json = await res.json() as { product: { id: string; slug: string } }
    expect(res.status).toBe(201)
    expect(json.product.id).toBe('p1')
    expect(json.product.slug).toBe('my-ebook')
  })

  it('sets isFree=true when price is 0', async () => {
    mockProductFindUnique.mockResolvedValue(null)
    await createProduct(
      makeReq('http://localhost/api/admin/products', 'POST', { ...VALID_BODY, price: 0 }),
    )
    expect(mockProductCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isFree: true }) }),
    )
  })

  it('sets isFree=false when price is positive', async () => {
    mockProductFindUnique.mockResolvedValue(null)
    await createProduct(
      makeReq('http://localhost/api/admin/products', 'POST', { ...VALID_BODY, price: 19 }),
    )
    expect(mockProductCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isFree: false }) }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/products/[productId]
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/admin/products/[productId]', () => {
  const CTX = makeParams({ productId: 'p1' })

  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED)
    const res = await getProduct(makeReq('http://localhost/api/admin/products/p1', 'GET'), CTX)
    expect(res.status).toBe(401)
  })

  it('returns 404 when product not found', async () => {
    mockProductFindUnique.mockResolvedValue(null)
    const res = await getProduct(makeReq('http://localhost/api/admin/products/p1', 'GET'), CTX)
    expect(res.status).toBe(404)
  })

  it('returns the product', async () => {
    const PRODUCT = { id: 'p1', slug: 'ebook', titleEn: 'Ebook' }
    mockProductFindUnique.mockResolvedValue(PRODUCT)
    const res  = await getProduct(makeReq('http://localhost/api/admin/products/p1', 'GET'), CTX)
    const json = await res.json() as { product: typeof PRODUCT }
    expect(res.status).toBe(200)
    expect(json.product.id).toBe('p1')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/products/[productId]
// ═══════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/admin/products/[productId]', () => {
  const CTX = makeParams({ productId: 'p1' })

  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED)
    const res = await updateProduct(
      makeReq('http://localhost/api/admin/products/p1', 'PATCH', { isPublished: true }), CTX,
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when body has no updatable fields', async () => {
    const res = await updateProduct(
      makeReq('http://localhost/api/admin/products/p1', 'PATCH', {}), CTX,
    )
    expect(res.status).toBe(400)
  })

  it('returns 404 when product not found', async () => {
    mockProductUpdate.mockResolvedValue(null)
    const res = await updateProduct(
      makeReq('http://localhost/api/admin/products/p1', 'PATCH', { isPublished: true }), CTX,
    )
    expect(res.status).toBe(404)
  })

  it('publishes product and returns 200', async () => {
    const res  = await updateProduct(
      makeReq('http://localhost/api/admin/products/p1', 'PATCH', { isPublished: true }), CTX,
    )
    const json = await res.json() as { product: { isPublished: boolean } }
    expect(res.status).toBe(200)
    expect(json.product.isPublished).toBe(true)
  })

  it('recalculates isFree when price is updated', async () => {
    mockProductUpdate.mockResolvedValue({ id: 'p1', slug: 'ebook', isPublished: false })
    await updateProduct(
      makeReq('http://localhost/api/admin/products/p1', 'PATCH', { price: 0 }), CTX,
    )
    expect(mockProductUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ price: 0, isFree: true }),
      }),
    )
  })

  it('clears coverImage to null when empty string passed', async () => {
    mockProductUpdate.mockResolvedValue({ id: 'p1', slug: 'ebook', isPublished: false })
    await updateProduct(
      makeReq('http://localhost/api/admin/products/p1', 'PATCH', { coverImage: '' }), CTX,
    )
    expect(mockProductUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ coverImage: null }) }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/admin/products/[productId]
// ═══════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/admin/products/[productId]', () => {
  const CTX = makeParams({ productId: 'p1' })

  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED)
    const res = await deleteProduct(makeReq('http://localhost/api/admin/products/p1', 'DELETE'), CTX)
    expect(res.status).toBe(401)
  })

  it('deletes product and returns { ok: true }', async () => {
    const res  = await deleteProduct(makeReq('http://localhost/api/admin/products/p1', 'DELETE'), CTX)
    const json = await res.json() as { ok: boolean }
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(mockProductDelete).toHaveBeenCalledWith({ where: { id: 'p1' } })
  })

  it('returns { ok: true } even when product does not exist (idempotent)', async () => {
    mockProductDelete.mockRejectedValue(new Error('not found'))
    const res  = await deleteProduct(makeReq('http://localhost/api/admin/products/p1', 'DELETE'), CTX)
    const json = await res.json() as { ok: boolean }
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })
})
