/**
 * Unit tests for the certificate system.
 *
 * Covers:
 *   lib/certificates  — checkCompletion, issueCertificate
 *   GET  /api/certificates — list
 *   POST /api/certificates — issue
 */

import { NextRequest } from 'next/server'

/* ─── mock: next-auth ────────────────────────────────────────────────────── */
const mockGetServerSession = jest.fn()
jest.mock('next-auth', () => ({ getServerSession: (...a: unknown[]) => mockGetServerSession(...a) }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

/* ─── mock: Prisma ───────────────────────────────────────────────────────── */
const mockLessonCount            = jest.fn()
const mockProgressCount          = jest.fn()
const mockEnrollmentFindUnique   = jest.fn()
const mockCertificateFindUnique  = jest.fn()
const mockCertificateCreate      = jest.fn()
const mockCertificateFindMany    = jest.fn()
const mockCourseFindUnique       = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    lesson:          { count:      (...a: unknown[]) => mockLessonCount(...a) },
    lessonProgress:  { count:      (...a: unknown[]) => mockProgressCount(...a) },
    enrollment:      { findUnique: (...a: unknown[]) => mockEnrollmentFindUnique(...a) },
    certificate: {
      findUnique: (...a: unknown[]) => mockCertificateFindUnique(...a),
      create:     (...a: unknown[]) => mockCertificateCreate(...a),
      findMany:   (...a: unknown[]) => mockCertificateFindMany(...a),
    },
    course: { findUnique: (...a: unknown[]) => mockCourseFindUnique(...a) },
  },
}))

/* ─── mock: notifications (fire-and-forget, not under test here) ─────────── */
jest.mock('@/lib/notifications', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}))

/* ─── helpers ────────────────────────────────────────────────────────────── */
const AUTH_SESSION = { user: { id: 'user-1', name: 'Test User' } }

function makeReq(method = 'GET', body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/certificates', {
    method,
    ...(body
      ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }
      : {}),
  })
}

/* ─── dynamic imports ────────────────────────────────────────────────────── */
let checkCompletion:             typeof import('@/lib/certificates').checkCompletion
let issueCertificate:            typeof import('@/lib/certificates').issueCertificate
let CourseNotCompleteError:      typeof import('@/lib/certificates').CourseNotCompleteError
let NotEnrolledError:            typeof import('@/lib/certificates').NotEnrolledError
let GET:   (req: NextRequest) => Promise<any>
let POST:  (req: NextRequest) => Promise<any>

beforeAll(async () => {
  const lib   = await import('@/lib/certificates')
  const route = await import('@/app/api/certificates/route')
  checkCompletion       = lib.checkCompletion
  issueCertificate      = lib.issueCertificate
  CourseNotCompleteError = lib.CourseNotCompleteError
  NotEnrolledError       = lib.NotEnrolledError
  GET  = route.GET
  POST = route.POST
})

beforeEach(() => {
  jest.clearAllMocks()
  mockGetServerSession.mockResolvedValue(AUTH_SESSION)
  mockCourseFindUnique.mockResolvedValue({ titleEn: 'Test Course', titleAr: 'دورة تجريبية', slug: 'test-course' })
})

// ─── checkCompletion ──────────────────────────────────────────────────────────

describe('checkCompletion()', () => {
  it('returns isComplete=true when all lessons done', async () => {
    mockLessonCount.mockResolvedValue(5)
    mockProgressCount.mockResolvedValue(5)
    const result = await checkCompletion('user-1', 'course-1')
    expect(result).toEqual({ total: 5, completed: 5, isComplete: true })
  })

  it('returns isComplete=false when some lessons remain', async () => {
    mockLessonCount.mockResolvedValue(5)
    mockProgressCount.mockResolvedValue(3)
    const result = await checkCompletion('user-1', 'course-1')
    expect(result).toEqual({ total: 5, completed: 3, isComplete: false })
  })

  it('returns isComplete=false when course has no lessons', async () => {
    mockLessonCount.mockResolvedValue(0)
    mockProgressCount.mockResolvedValue(0)
    const result = await checkCompletion('user-1', 'course-1')
    expect(result.isComplete).toBe(false)
  })
})

// ─── issueCertificate ─────────────────────────────────────────────────────────

describe('issueCertificate()', () => {
  it('throws NotEnrolledError when not enrolled', async () => {
    mockEnrollmentFindUnique.mockResolvedValue(null)
    await expect(issueCertificate('user-1', 'course-1')).rejects.toBeInstanceOf(NotEnrolledError)
  })

  it('throws CourseNotCompleteError when lessons remain', async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ id: 'enroll-1' })
    mockLessonCount.mockResolvedValue(5)
    mockProgressCount.mockResolvedValue(3)
    await expect(issueCertificate('user-1', 'course-1')).rejects.toBeInstanceOf(CourseNotCompleteError)
  })

  it('returns existing certificate when already issued', async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ id: 'enroll-1' })
    mockLessonCount.mockResolvedValue(4)
    mockProgressCount.mockResolvedValue(4)
    const existing = { id: 'cert-old', code: 'CODE-EXISTING', userId: 'user-1', courseId: 'course-1' }
    mockCertificateFindUnique.mockResolvedValue(existing)
    const result = await issueCertificate('user-1', 'course-1')
    expect(result).toBe(existing)
    expect(mockCertificateCreate).not.toHaveBeenCalled()
  })

  it('creates and returns new certificate when complete and not yet issued', async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ id: 'enroll-1' })
    mockLessonCount.mockResolvedValue(3)
    mockProgressCount.mockResolvedValue(3)
    mockCertificateFindUnique.mockResolvedValue(null)
    const created = { id: 'cert-new', code: 'CODE-NEW', userId: 'user-1', courseId: 'course-1' }
    mockCertificateCreate.mockResolvedValue(created)
    const result = await issueCertificate('user-1', 'course-1')
    expect(result).toBe(created)
    expect(mockCertificateCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: 'user-1', courseId: 'course-1' } })
    )
  })
})

// ─── GET /api/certificates ────────────────────────────────────────────────────

describe('GET /api/certificates', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns the user\'s certificates', async () => {
    const certs = [
      { id: 'c1', code: 'ABC', issuedAt: new Date(), course: { titleEn: 'Course A', titleAr: 'دورة أ', slug: 'course-a' } },
    ]
    mockCertificateFindMany.mockResolvedValue(certs)
    const res  = await GET(makeReq())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.certificates).toHaveLength(1)
    expect(json.certificates[0].code).toBe('ABC')
  })
})

// ─── POST /api/certificates ───────────────────────────────────────────────────

describe('POST /api/certificates', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makeReq('POST', { courseId: 'c1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when courseId is missing', async () => {
    const res  = await POST(makeReq('POST', {}))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/courseId/i)
  })

  it('returns 403 when user is not enrolled', async () => {
    mockEnrollmentFindUnique.mockResolvedValue(null)
    const res = await POST(makeReq('POST', { courseId: 'c1' }))
    expect(res.status).toBe(403)
  })

  it('returns 422 when course is not complete', async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ id: 'e1' })
    mockLessonCount.mockResolvedValue(5)
    mockProgressCount.mockResolvedValue(2)
    const res  = await POST(makeReq('POST', { courseId: 'c1' }))
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.total).toBe(5)
    expect(json.completed).toBe(2)
  })

  it('returns 201 with certificate when course is complete', async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ id: 'e1' })
    mockLessonCount.mockResolvedValue(3)
    mockProgressCount.mockResolvedValue(3)
    mockCertificateFindUnique.mockResolvedValue(null)
    mockCertificateCreate.mockResolvedValue({ id: 'cert-new', code: 'CERT-CODE', userId: 'user-1', courseId: 'c1', issuedAt: new Date() })
    const res  = await POST(makeReq('POST', { courseId: 'c1' }))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.certificate.code).toBe('CERT-CODE')
  })

  it('returns 201 with existing certificate if already issued (idempotent)', async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ id: 'e1' })
    mockLessonCount.mockResolvedValue(2)
    mockProgressCount.mockResolvedValue(2)
    const existing = { id: 'cert-old', code: 'ALREADY-ISSUED', userId: 'user-1', courseId: 'c1', issuedAt: new Date() }
    mockCertificateFindUnique.mockResolvedValue(existing)
    const res  = await POST(makeReq('POST', { courseId: 'c1' }))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.certificate.code).toBe('ALREADY-ISSUED')
    expect(mockCertificateCreate).not.toHaveBeenCalled()
  })
})
