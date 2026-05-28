/**
 * Unit tests — Admin Users API
 *
 * Covers:
 *   GET  /api/admin/users               — paginated list with search + role filter
 *   GET  /api/admin/users/[userId]      — full user profile
 *   PATCH /api/admin/users/[userId]     — role update (with self-demotion guard)
 *   POST   /api/admin/users/[userId]/enroll — manual enrollment
 *   DELETE /api/admin/users/[userId]/enroll — remove enrollment
 */
import { NextRequest } from 'next/server'

// ─── Mock declarations ────────────────────────────────────────────────────────

const mockRequireAdminSession = jest.fn()

// User model
const mockUserFindMany    = jest.fn()
const mockUserCount       = jest.fn()
const mockUserFindUnique  = jest.fn()
const mockUserUpdate      = jest.fn()

// Course model
const mockCourseFindUnique = jest.fn()

// Enrollment model
const mockEnrollmentUpsert     = jest.fn()
const mockEnrollmentDeleteMany = jest.fn()

// ─── jest.mock ────────────────────────────────────────────────────────────────

jest.mock('@/lib/adminGuard', () => ({
  requireAdminSession: (...a: unknown[]) => mockRequireAdminSession(...a),
}))

jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findMany:   (...a: unknown[]) => mockUserFindMany(...a),
      count:      (...a: unknown[]) => mockUserCount(...a),
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      update:     (...a: unknown[]) => mockUserUpdate(...a),
    },
    course: {
      findUnique: (...a: unknown[]) => mockCourseFindUnique(...a),
    },
    enrollment: {
      upsert:     (...a: unknown[]) => mockEnrollmentUpsert(...a),
      deleteMany: (...a: unknown[]) => mockEnrollmentDeleteMany(...a),
    },
  },
}))

// ─── Shared helpers ───────────────────────────────────────────────────────────

const ADMIN_SESSION = {
  session: { user: { id: 'admin-1', role: 'ADMIN', email: 'admin@example.com' } },
  error: null,
}

function makeRequest(
  body: unknown,
  path: string,
  method = 'GET',
  searchParams?: Record<string, string>
): NextRequest {
  const url = new URL(`http://localhost:3000${path}`)
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v)
  }
  if (method === 'GET') {
    return new NextRequest(url)
  }
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

const SAMPLE_USER = {
  id:              'user-1',
  name:            'Ahmed Ali',
  email:           'ahmed@example.com',
  role:            'STUDENT',
  createdAt:       new Date('2025-01-01'),
  preferredLocale: 'ar',
  _count:          { enrollments: 2, productPurchases: 1 },
  subscription:    null,
}

beforeEach(() => {
  jest.resetAllMocks()
  mockRequireAdminSession.mockResolvedValue(ADMIN_SESSION)
})

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

describe('GET /api/admin/users', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GET: (req: NextRequest) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/users/route')
    GET = mod.GET
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAdminSession.mockResolvedValueOnce({
      session: null,
      error:   new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })
    const req = makeRequest(null, '/api/admin/users')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns paginated users with defaults', async () => {
    mockUserFindMany.mockResolvedValueOnce([SAMPLE_USER])
    mockUserCount.mockResolvedValueOnce(1)

    const req = makeRequest(null, '/api/admin/users')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.users).toHaveLength(1)
    expect(json.pagination.total).toBe(1)
    expect(json.pagination.page).toBe(1)
    expect(json.pagination.pageSize).toBe(25)
    expect(json.pagination.totalPages).toBe(1)
  })

  it('passes search query to Prisma OR filter', async () => {
    mockUserFindMany.mockResolvedValueOnce([])
    mockUserCount.mockResolvedValueOnce(0)

    const req = makeRequest(null, '/api/admin/users', 'GET', { q: 'ahmed' })
    await GET(req)

    const callArgs = mockUserFindMany.mock.calls[0][0]
    expect(callArgs.where.OR).toBeDefined()
    expect(callArgs.where.OR[0].name.contains).toBe('ahmed')
    expect(callArgs.where.OR[1].email.contains).toBe('ahmed')
  })

  it('passes role filter to Prisma where clause', async () => {
    mockUserFindMany.mockResolvedValueOnce([])
    mockUserCount.mockResolvedValueOnce(0)

    const req = makeRequest(null, '/api/admin/users', 'GET', { role: 'ADMIN' })
    await GET(req)

    const callArgs = mockUserFindMany.mock.calls[0][0]
    expect(callArgs.where.role).toBe('ADMIN')
  })

  it('handles pagination params correctly', async () => {
    mockUserFindMany.mockResolvedValueOnce([])
    mockUserCount.mockResolvedValueOnce(50)

    const req = makeRequest(null, '/api/admin/users', 'GET', { page: '2', pageSize: '10' })
    const res = await GET(req)
    const json = await res.json()

    expect(json.pagination.page).toBe(2)
    expect(json.pagination.pageSize).toBe(10)
    expect(json.pagination.totalPages).toBe(5)

    const callArgs = mockUserFindMany.mock.calls[0][0]
    expect(callArgs.skip).toBe(10)
    expect(callArgs.take).toBe(10)
  })

  it('caps pageSize at 100', async () => {
    mockUserFindMany.mockResolvedValueOnce([])
    mockUserCount.mockResolvedValueOnce(0)

    const req = makeRequest(null, '/api/admin/users', 'GET', { pageSize: '999' })
    await GET(req)

    const callArgs = mockUserFindMany.mock.calls[0][0]
    expect(callArgs.take).toBe(100)
  })

  it('floors page at 1 for invalid values', async () => {
    mockUserFindMany.mockResolvedValueOnce([])
    mockUserCount.mockResolvedValueOnce(0)

    const req = makeRequest(null, '/api/admin/users', 'GET', { page: '-5' })
    await GET(req)

    const callArgs = mockUserFindMany.mock.calls[0][0]
    expect(callArgs.skip).toBe(0)
  })

  it('returns no OR filter when q is empty string', async () => {
    mockUserFindMany.mockResolvedValueOnce([SAMPLE_USER])
    mockUserCount.mockResolvedValueOnce(1)

    const req = makeRequest(null, '/api/admin/users', 'GET', { q: '' })
    await GET(req)

    const callArgs = mockUserFindMany.mock.calls[0][0]
    expect(callArgs.where.OR).toBeUndefined()
  })
})

// ─── GET /api/admin/users/[userId] ───────────────────────────────────────────

describe('GET /api/admin/users/[userId]', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GET: (req: NextRequest, ctx: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/users/[userId]/route')
    GET = mod.GET
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAdminSession.mockResolvedValueOnce({
      session: null,
      error:   new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })
    const req = makeRequest(null, '/api/admin/users/user-1')
    const res = await GET(req, { params: Promise.resolve({ userId: 'user-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 for unknown user', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null)

    const req = makeRequest(null, '/api/admin/users/ghost')
    const res = await GET(req, { params: Promise.resolve({ userId: 'ghost' }) })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('User not found')
  })

  it('returns full user profile', async () => {
    mockUserFindUnique.mockResolvedValueOnce({
      ...SAMPLE_USER,
      stripeCustomerId: 'cus_test',
      enrollments:      [],
      coursePurchases:  [],
      productPurchases: [],
      subscription:     null,
    })

    const req = makeRequest(null, '/api/admin/users/user-1')
    const res = await GET(req, { params: Promise.resolve({ userId: 'user-1' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.user.id).toBe('user-1')
    expect(json.user.stripeCustomerId).toBe('cus_test')
  })
})

// ─── PATCH /api/admin/users/[userId] ─────────────────────────────────────────

describe('PATCH /api/admin/users/[userId]', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PATCH: (req: NextRequest, ctx: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/users/[userId]/route')
    PATCH = mod.PATCH
  })

  it('returns 400 when admin tries to change own role', async () => {
    const req = makeRequest({ role: 'STUDENT' }, '/api/admin/users/admin-1', 'PATCH')
    const res = await PATCH(req, { params: Promise.resolve({ userId: 'admin-1' }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/own role/)
  })

  it('returns 400 for invalid role value', async () => {
    const req = makeRequest({ role: 'SUPERADMIN' }, '/api/admin/users/user-2', 'PATCH')
    const res = await PATCH(req, { params: Promise.resolve({ userId: 'user-2' }) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when role is missing from body', async () => {
    const req = makeRequest({}, '/api/admin/users/user-2', 'PATCH')
    const res = await PATCH(req, { params: Promise.resolve({ userId: 'user-2' }) })
    expect(res.status).toBe(400)
  })

  it('promotes STUDENT to ADMIN successfully', async () => {
    mockUserUpdate.mockResolvedValueOnce({ id: 'user-2', role: 'ADMIN' })

    const req = makeRequest({ role: 'ADMIN' }, '/api/admin/users/user-2', 'PATCH')
    const res = await PATCH(req, { params: Promise.resolve({ userId: 'user-2' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.user.role).toBe('ADMIN')
  })

  it('demotes ADMIN to STUDENT successfully', async () => {
    mockUserUpdate.mockResolvedValueOnce({ id: 'user-3', role: 'STUDENT' })

    const req = makeRequest({ role: 'STUDENT' }, '/api/admin/users/user-3', 'PATCH')
    const res = await PATCH(req, { params: Promise.resolve({ userId: 'user-3' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.user.role).toBe('STUDENT')
  })

  it('returns 404 when user does not exist', async () => {
    mockUserUpdate.mockRejectedValueOnce(new Error('Record not found'))

    const req = makeRequest({ role: 'ADMIN' }, '/api/admin/users/ghost', 'PATCH')
    const res = await PATCH(req, { params: Promise.resolve({ userId: 'ghost' }) })
    expect(res.status).toBe(404)
  })
})

// ─── POST /api/admin/users/[userId]/enroll ────────────────────────────────────

describe('POST /api/admin/users/[userId]/enroll', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: (req: NextRequest, ctx: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/users/[userId]/enroll/route')
    POST = mod.POST
  })

  it('returns 400 when courseId is missing', async () => {
    const req = makeRequest({}, '/api/admin/users/user-1/enroll', 'POST')
    const res = await POST(req, { params: Promise.resolve({ userId: 'user-1' }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/courseId/)
  })

  it('returns 404 when user not found', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null)
    mockCourseFindUnique.mockResolvedValueOnce({ id: 'course-1' })

    const req = makeRequest({ courseId: 'course-1' }, '/api/admin/users/ghost/enroll', 'POST')
    const res = await POST(req, { params: Promise.resolve({ userId: 'ghost' }) })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('User not found')
  })

  it('returns 404 when course not found', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: 'user-1' })
    mockCourseFindUnique.mockResolvedValueOnce(null)

    const req = makeRequest({ courseId: 'ghost-course' }, '/api/admin/users/user-1/enroll', 'POST')
    const res = await POST(req, { params: Promise.resolve({ userId: 'user-1' }) })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Course not found')
  })

  it('creates enrollment with ADMIN accessType and returns 201', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: 'user-1' })
    mockCourseFindUnique.mockResolvedValueOnce({ id: 'course-1' })
    mockEnrollmentUpsert.mockResolvedValueOnce({
      id:         'enrollment-1',
      userId:     'user-1',
      courseId:   'course-1',
      accessType: 'ADMIN',
    })

    const req = makeRequest({ courseId: 'course-1' }, '/api/admin/users/user-1/enroll', 'POST')
    const res = await POST(req, { params: Promise.resolve({ userId: 'user-1' }) })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.enrollment.accessType).toBe('ADMIN')
  })

  it('uses upsert so re-enrolling does not fail', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: 'user-1' })
    mockCourseFindUnique.mockResolvedValueOnce({ id: 'course-1' })
    mockEnrollmentUpsert.mockResolvedValueOnce({
      id:         'enrollment-1',
      userId:     'user-1',
      courseId:   'course-1',
      accessType: 'ADMIN',
    })

    const req = makeRequest({ courseId: 'course-1' }, '/api/admin/users/user-1/enroll', 'POST')
    await POST(req, { params: Promise.resolve({ userId: 'user-1' }) })

    const upsertCall = mockEnrollmentUpsert.mock.calls[0][0]
    expect(upsertCall.where).toBeDefined()
    expect(upsertCall.create.accessType).toBe('ADMIN')
    expect(upsertCall.update.accessType).toBe('ADMIN')
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAdminSession.mockResolvedValueOnce({
      session: null,
      error:   new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })
    const req = makeRequest({ courseId: 'course-1' }, '/api/admin/users/user-1/enroll', 'POST')
    const res = await POST(req, { params: Promise.resolve({ userId: 'user-1' }) })
    expect(res.status).toBe(401)
  })
})

// ─── DELETE /api/admin/users/[userId]/enroll ──────────────────────────────────

describe('DELETE /api/admin/users/[userId]/enroll', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let DELETE: (req: NextRequest, ctx: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/users/[userId]/enroll/route')
    DELETE = mod.DELETE
  })

  it('returns 400 when courseId is missing', async () => {
    const req = makeRequest({}, '/api/admin/users/user-1/enroll', 'DELETE')
    const res = await DELETE(req, { params: Promise.resolve({ userId: 'user-1' }) })
    expect(res.status).toBe(400)
  })

  it('removes the enrollment and returns ok', async () => {
    mockEnrollmentDeleteMany.mockResolvedValueOnce({ count: 1 })

    const req = makeRequest({ courseId: 'course-1' }, '/api/admin/users/user-1/enroll', 'DELETE')
    const res = await DELETE(req, { params: Promise.resolve({ userId: 'user-1' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('returns ok even when enrollment did not exist (idempotent)', async () => {
    mockEnrollmentDeleteMany.mockResolvedValueOnce({ count: 0 })

    const req = makeRequest({ courseId: 'no-such-course' }, '/api/admin/users/user-1/enroll', 'DELETE')
    const res = await DELETE(req, { params: Promise.resolve({ userId: 'user-1' }) })
    expect(res.status).toBe(200)
  })
})
