/**
 * Unit tests — Admin Content & Stats APIs
 *
 * Covers:
 *   GET  /api/admin/courses           — list courses
 *   POST /api/admin/courses           — create course (validation + slug uniqueness)
 *   GET  /api/admin/courses/[id]      — fetch course with lessons
 *   PATCH /api/admin/courses/[id]     — partial update
 *   DELETE /api/admin/courses/[id]    — delete course
 *   GET  /api/admin/stats             — dashboard aggregates
 *   POST /api/admin/upload            — signed S3 URL (key prefix guard)
 */
import { NextRequest } from 'next/server'

// ─── Mock declarations ────────────────────────────────────────────────────────

const mockRequireAdminSession = jest.fn()

// Course model
const mockCourseFindMany   = jest.fn()
const mockCourseFindUnique = jest.fn()
const mockCourseCreate     = jest.fn()
const mockCourseUpdate     = jest.fn()
const mockCourseDelete     = jest.fn()
const mockCourseCount      = jest.fn()

// Lesson model
const mockLessonCount = jest.fn()

// Product model
const mockProductCount = jest.fn()

// User model
const mockUserCount = jest.fn()

// Enrollment model
const mockEnrollmentCount = jest.fn()

// Subscription model
const mockSubscriptionCount = jest.fn()

// CoursePurchase model
const mockCoursePurchaseAggregate = jest.fn()

// ProductPurchase model
const mockProductPurchaseAggregate = jest.fn()

// S3 helper
const mockGetSignedUploadUrl = jest.fn()

// slugify
const mockSlugify = jest.fn((s: string) => s.toLowerCase().replace(/\s+/g, '-'))

// ─── jest.mock ────────────────────────────────────────────────────────────────

jest.mock('@/lib/adminGuard', () => ({
  requireAdminSession: (...a: unknown[]) => mockRequireAdminSession(...a),
}))

jest.mock('@/lib/db', () => ({
  db: {
    course: {
      findMany:   (...a: unknown[]) => mockCourseFindMany(...a),
      findUnique: (...a: unknown[]) => mockCourseFindUnique(...a),
      create:     (...a: unknown[]) => mockCourseCreate(...a),
      update:     (...a: unknown[]) => mockCourseUpdate(...a),
      delete:     (...a: unknown[]) => mockCourseDelete(...a),
      count:      (...a: unknown[]) => mockCourseCount(...a),
    },
    lesson: {
      count: (...a: unknown[]) => mockLessonCount(...a),
    },
    product: {
      count: (...a: unknown[]) => mockProductCount(...a),
    },
    user: {
      count: (...a: unknown[]) => mockUserCount(...a),
    },
    enrollment: {
      count: (...a: unknown[]) => mockEnrollmentCount(...a),
    },
    subscription: {
      count: (...a: unknown[]) => mockSubscriptionCount(...a),
    },
    coursePurchase: {
      aggregate: (...a: unknown[]) => mockCoursePurchaseAggregate(...a),
    },
    productPurchase: {
      aggregate: (...a: unknown[]) => mockProductPurchaseAggregate(...a),
    },
  },
}))

jest.mock('@/lib/s3', () => ({
  getSignedUploadUrl: (...a: unknown[]) => mockGetSignedUploadUrl(...a),
  s3Keys:             {},
}))

jest.mock('@/lib/utils', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slugify: (s: any) => mockSlugify(s),
}))

// ─── Shared helpers ───────────────────────────────────────────────────────────

const ADMIN_SESSION = {
  session: { user: { id: 'admin-1', role: 'ADMIN', email: 'admin@example.com' } },
  error: null,
}

function makeReq(body: unknown, path: string, method = 'GET'): NextRequest {
  if (method === 'GET' || method === 'DELETE') {
    return new NextRequest(`http://localhost:3000${path}`, { method })
  }
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

const VALID_COURSE_BODY = {
  titleEn:       'Parenting 101',
  titleAr:       'تربية الأطفال ١٠١',
  descriptionEn: 'A comprehensive parenting guide',
  descriptionAr: 'دليل شامل لتربية الأطفال',
  shortDescEn:   'Learn parenting basics',
  shortDescAr:   'تعلم أساسيات التربية',
  price:         49,
}

const SAMPLE_COURSE = {
  id:           'course-1',
  slug:         'parenting-101',
  titleEn:      'Parenting 101',
  titleAr:      'تربية الأطفال ١٠١',
  price:        49,
  isPublished:  false,
  isMemberOnly: false,
  level:        'BEGINNER',
  _count:       { lessons: 0 },
}

beforeEach(() => {
  jest.resetAllMocks()
  mockRequireAdminSession.mockResolvedValue(ADMIN_SESSION)
})

// ─── GET /api/admin/courses ───────────────────────────────────────────────────

describe('GET /api/admin/courses', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GET: () => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/courses/route')
    GET = mod.GET
  })

  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValueOnce({
      session: null,
      error:   new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns courses array', async () => {
    mockCourseFindMany.mockResolvedValueOnce([SAMPLE_COURSE])

    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.courses).toHaveLength(1)
    expect(json.courses[0].titleEn).toBe('Parenting 101')
  })

  it('returns empty array when no courses exist', async () => {
    mockCourseFindMany.mockResolvedValueOnce([])

    const res = await GET()
    const json = await res.json()
    expect(json.courses).toHaveLength(0)
  })
})

// ─── POST /api/admin/courses ──────────────────────────────────────────────────

describe('POST /api/admin/courses', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: (req: NextRequest) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/courses/route')
    POST = mod.POST
  })

  it('returns 400 when titleEn is missing', async () => {
    const req = makeReq({ ...VALID_COURSE_BODY, titleEn: '' }, '/api/admin/courses', 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/titleEn/)
  })

  it('returns 400 when titleAr is missing', async () => {
    const req = makeReq({ ...VALID_COURSE_BODY, titleAr: '' }, '/api/admin/courses', 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when descriptionEn is missing', async () => {
    const req = makeReq({ ...VALID_COURSE_BODY, descriptionEn: '' }, '/api/admin/courses', 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when shortDescAr is missing', async () => {
    const req = makeReq({ ...VALID_COURSE_BODY, shortDescAr: '' }, '/api/admin/courses', 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 409 when slug is already in use', async () => {
    mockCourseFindUnique.mockResolvedValueOnce({ id: 'existing' }) // slug taken

    const req = makeReq(VALID_COURSE_BODY, '/api/admin/courses', 'POST')
    const res = await POST(req)
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already in use/)
  })

  it('creates course and returns 201 with id + slug', async () => {
    mockCourseFindUnique.mockResolvedValueOnce(null) // slug available
    mockCourseCreate.mockResolvedValueOnce({ id: 'course-new', slug: 'parenting-101' })

    const req = makeReq(VALID_COURSE_BODY, '/api/admin/courses', 'POST')
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.course.id).toBe('course-new')
    expect(json.course.slug).toBe('parenting-101')
  })

  it('uses supplied slug instead of auto-generating', async () => {
    mockCourseFindUnique.mockResolvedValueOnce(null)
    mockCourseCreate.mockResolvedValueOnce({ id: 'course-new', slug: 'custom-slug' })

    const req = makeReq({ ...VALID_COURSE_BODY, slug: 'custom-slug' }, '/api/admin/courses', 'POST')
    await POST(req)

    // slugify should NOT have been called since a raw slug was provided
    expect(mockSlugify).not.toHaveBeenCalled()
  })

  it('generates slug from titleEn when slug omitted', async () => {
    mockCourseFindUnique.mockResolvedValueOnce(null)
    mockCourseCreate.mockResolvedValueOnce({ id: 'course-new', slug: 'parenting-101' })

    const req = makeReq(VALID_COURSE_BODY, '/api/admin/courses', 'POST')
    await POST(req)

    expect(mockSlugify).toHaveBeenCalledWith('Parenting 101')
  })

  it('sets price to 0 and isMemberOnly to false by default', async () => {
    const bodyWithoutPrice = { ...VALID_COURSE_BODY }
    delete (bodyWithoutPrice as Record<string, unknown>).price
    mockCourseFindUnique.mockResolvedValueOnce(null)
    mockCourseCreate.mockResolvedValueOnce({ id: 'course-new', slug: 'parenting-101' })

    const req = makeReq(bodyWithoutPrice, '/api/admin/courses', 'POST')
    await POST(req)

    const createCall = mockCourseCreate.mock.calls[0][0]
    expect(createCall.data.price).toBe(0)
    expect(createCall.data.isMemberOnly).toBe(false)
  })
})

// ─── GET /api/admin/courses/[courseId] ───────────────────────────────────────

describe('GET /api/admin/courses/[courseId]', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GET: (req: NextRequest, ctx: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/courses/[courseId]/route')
    GET = mod.GET
  })

  it('returns 404 when course not found', async () => {
    mockCourseFindUnique.mockResolvedValueOnce(null)

    const req = makeReq(null, '/api/admin/courses/ghost')
    const res = await GET(req, { params: Promise.resolve({ courseId: 'ghost' }) })
    expect(res.status).toBe(404)
  })

  it('returns course with lessons', async () => {
    mockCourseFindUnique.mockResolvedValueOnce({
      ...SAMPLE_COURSE,
      lessons: [{ id: 'lesson-1', titleEn: 'Intro', position: 1, isPublished: true }],
    })

    const req = makeReq(null, '/api/admin/courses/course-1')
    const res = await GET(req, { params: Promise.resolve({ courseId: 'course-1' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.course.lessons).toHaveLength(1)
  })
})

// ─── PATCH /api/admin/courses/[courseId] ─────────────────────────────────────

describe('PATCH /api/admin/courses/[courseId]', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PATCH: (req: NextRequest, ctx: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/courses/[courseId]/route')
    PATCH = mod.PATCH
  })

  it('returns 400 when body has no updatable fields', async () => {
    const req = makeReq({}, '/api/admin/courses/course-1', 'PATCH')
    const res = await PATCH(req, { params: Promise.resolve({ courseId: 'course-1' }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/No fields/)
  })

  it('publishes a course', async () => {
    mockCourseUpdate.mockResolvedValueOnce({ id: 'course-1', slug: 'parenting-101', isPublished: true })

    const req = makeReq({ isPublished: true }, '/api/admin/courses/course-1', 'PATCH')
    const res = await PATCH(req, { params: Promise.resolve({ courseId: 'course-1' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.course.isPublished).toBe(true)
  })

  it('updates titleEn only (partial update)', async () => {
    mockCourseUpdate.mockResolvedValueOnce({ id: 'course-1', slug: 'parenting-101', isPublished: false })

    const req = makeReq({ titleEn: 'Updated Title' }, '/api/admin/courses/course-1', 'PATCH')
    await PATCH(req, { params: Promise.resolve({ courseId: 'course-1' }) })

    const updateCall = mockCourseUpdate.mock.calls[0][0]
    expect(updateCall.data.titleEn).toBe('Updated Title')
    expect(updateCall.data.isPublished).toBeUndefined()
  })

  it('returns 404 when course not found on update', async () => {
    mockCourseUpdate.mockRejectedValueOnce(new Error('Record not found'))

    const req = makeReq({ titleEn: 'Ghost' }, '/api/admin/courses/ghost', 'PATCH')
    const res = await PATCH(req, { params: Promise.resolve({ courseId: 'ghost' }) })
    expect(res.status).toBe(404)
  })

  it('strips empty string thumbnail to null', async () => {
    mockCourseUpdate.mockResolvedValueOnce({ id: 'course-1', slug: 'parenting-101', isPublished: false })

    const req = makeReq({ thumbnail: '  ' }, '/api/admin/courses/course-1', 'PATCH')
    await PATCH(req, { params: Promise.resolve({ courseId: 'course-1' }) })

    const updateCall = mockCourseUpdate.mock.calls[0][0]
    expect(updateCall.data.thumbnail).toBeNull()
  })
})

// ─── DELETE /api/admin/courses/[courseId] ────────────────────────────────────

describe('DELETE /api/admin/courses/[courseId]', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let DELETE: (req: NextRequest, ctx: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/courses/[courseId]/route')
    DELETE = mod.DELETE
  })

  it('deletes course and returns ok', async () => {
    mockCourseDelete.mockResolvedValueOnce({ id: 'course-1' })

    const req = makeReq(null, '/api/admin/courses/course-1', 'DELETE')
    const res = await DELETE(req, { params: Promise.resolve({ courseId: 'course-1' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('returns ok even when course did not exist (catch swallows error)', async () => {
    mockCourseDelete.mockRejectedValueOnce(new Error('Not found'))

    const req = makeReq(null, '/api/admin/courses/ghost', 'DELETE')
    const res = await DELETE(req, { params: Promise.resolve({ courseId: 'ghost' }) })
    expect(res.status).toBe(200)
  })

  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValueOnce({
      session: null,
      error:   new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })
    const req = makeReq(null, '/api/admin/courses/course-1', 'DELETE')
    const res = await DELETE(req, { params: Promise.resolve({ courseId: 'course-1' }) })
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

describe('GET /api/admin/stats', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GET: () => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/stats/route')
    GET = mod.GET
  })

  function setupStatsMocks({
    totalCourses = 5,
    publishedCourses = 3,
    totalLessons = 20,
    totalProducts = 4,
    totalUsers = 100,
    totalEnrollments = 50,
    activeSubscriptions = 10,
    courseRevAmount = 999,
    productRevAmount = 200,
  } = {}) {
    mockCourseCount
      .mockResolvedValueOnce(totalCourses)
      .mockResolvedValueOnce(publishedCourses)
    mockLessonCount.mockResolvedValueOnce(totalLessons)
    mockProductCount.mockResolvedValueOnce(totalProducts)
    mockUserCount.mockResolvedValueOnce(totalUsers)
    mockEnrollmentCount.mockResolvedValueOnce(totalEnrollments)
    mockSubscriptionCount.mockResolvedValueOnce(activeSubscriptions)
    mockCoursePurchaseAggregate.mockResolvedValueOnce({ _sum: { amount: courseRevAmount } })
    mockProductPurchaseAggregate.mockResolvedValueOnce({ _sum: { amount: productRevAmount } })
  }

  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValueOnce({
      session: null,
      error:   new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns all aggregate stats', async () => {
    setupStatsMocks()

    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.totalCourses).toBe(5)
    expect(json.publishedCourses).toBe(3)
    expect(json.totalLessons).toBe(20)
    expect(json.totalProducts).toBe(4)
    expect(json.totalUsers).toBe(100)
    expect(json.totalEnrollments).toBe(50)
    expect(json.activeSubscriptions).toBe(10)
    expect(json.revenueThirtyDays).toBeCloseTo(1199)
  })

  it('sums course and product revenue correctly', async () => {
    setupStatsMocks({ courseRevAmount: 500, productRevAmount: 150 })

    const res = await GET()
    const json = await res.json()
    expect(json.revenueThirtyDays).toBeCloseTo(650)
  })

  it('handles null aggregate amount gracefully', async () => {
    mockCourseCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0)
    mockLessonCount.mockResolvedValueOnce(0)
    mockProductCount.mockResolvedValueOnce(0)
    mockUserCount.mockResolvedValueOnce(0)
    mockEnrollmentCount.mockResolvedValueOnce(0)
    mockSubscriptionCount.mockResolvedValueOnce(0)
    mockCoursePurchaseAggregate.mockResolvedValueOnce({ _sum: { amount: null } })
    mockProductPurchaseAggregate.mockResolvedValueOnce({ _sum: { amount: null } })

    const res = await GET()
    const json = await res.json()
    expect(json.revenueThirtyDays).toBe(0)
  })
})

// ─── POST /api/admin/upload ───────────────────────────────────────────────────

describe('POST /api/admin/upload', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: (req: NextRequest) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/upload/route')
    POST = mod.POST
  })

  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValueOnce({
      session: null,
      error:   new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })
    const req = makeReq({ key: 'lessons/a.mp4', contentType: 'video/mp4' }, '/api/admin/upload', 'POST')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when key is missing', async () => {
    const req = makeReq({ contentType: 'video/mp4' }, '/api/admin/upload', 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when contentType is missing', async () => {
    const req = makeReq({ key: 'lessons/a.mp4' }, '/api/admin/upload', 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for disallowed key prefix', async () => {
    const req = makeReq({ key: 'secrets/creds.json', contentType: 'application/json' }, '/api/admin/upload', 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/must start with/)
  })

  it('returns 400 for "../" traversal attempt', async () => {
    const req = makeReq({ key: '../etc/passwd', contentType: 'text/plain' }, '/api/admin/upload', 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it.each([
    ['lessons/video.mp4',       'video/mp4'],
    ['products/book.pdf',       'application/pdf'],
    ['covers/cover.jpg',        'image/jpeg'],
    ['thumbnails/thumb.webp',   'image/webp'],
  ])('accepts allowed prefix: %s', async (key, contentType) => {
    mockGetSignedUploadUrl.mockResolvedValueOnce('https://s3.example.com/presigned')

    const req = makeReq({ key, contentType }, '/api/admin/upload', 'POST')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.uploadUrl).toBe('https://s3.example.com/presigned')
    expect(json.key).toBe(key)
  })

  it('calls getSignedUploadUrl with correct expiry (300s)', async () => {
    mockGetSignedUploadUrl.mockResolvedValueOnce('https://s3.example.com/presigned')

    const req = makeReq({ key: 'lessons/my-video.mp4', contentType: 'video/mp4' }, '/api/admin/upload', 'POST')
    await POST(req)

    expect(mockGetSignedUploadUrl).toHaveBeenCalledWith('lessons/my-video.mp4', 'video/mp4', 300)
  })
})
