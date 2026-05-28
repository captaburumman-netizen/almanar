/**
 * Unit tests — src/lib/certificates.ts
 *
 * Covers: checkCompletion, issueCertificate (guard clauses + idempotency +
 *         notification side-effect), getUserCertificates, getCertificateByCode,
 *         and the two custom error classes.
 *
 * Prisma is mocked; createNotification is mocked (fire-and-forget).
 */

// ─── Mocks: Prisma ────────────────────────────────────────────────────────────

const mockEnrollmentFindUnique    = jest.fn()
const mockLessonCount             = jest.fn()
const mockLessonProgressCount     = jest.fn()
const mockCertificateFindUnique   = jest.fn()
const mockCertificateCreate       = jest.fn()
const mockCertificateFindMany     = jest.fn()
const mockCourseFindUnique        = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    enrollment: {
      findUnique: (...a: unknown[]) => mockEnrollmentFindUnique(...a),
    },
    lesson: {
      count: (...a: unknown[]) => mockLessonCount(...a),
    },
    lessonProgress: {
      count: (...a: unknown[]) => mockLessonProgressCount(...a),
    },
    certificate: {
      findUnique: (...a: unknown[]) => mockCertificateFindUnique(...a),
      create:     (...a: unknown[]) => mockCertificateCreate(...a),
      findMany:   (...a: unknown[]) => mockCertificateFindMany(...a),
    },
    course: {
      findUnique: (...a: unknown[]) => mockCourseFindUnique(...a),
    },
  },
}))

// ─── Mock: notifications ──────────────────────────────────────────────────────

const mockCreateNotification = jest.fn()

jest.mock('@/lib/notifications', () => ({
  createNotification: (...a: unknown[]) => mockCreateNotification(...a),
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  checkCompletion,
  issueCertificate,
  getUserCertificates,
  getCertificateByCode,
  CourseNotCompleteError,
  NotEnrolledError,
} from '@/lib/certificates'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CERT_ROW = {
  id:       'cert-1',
  code:     'CERT-ABC123',
  userId:   'user-1',
  courseId: 'course-1',
  issuedAt: new Date('2024-06-15T12:00:00Z'),
}

const COURSE_ROW = {
  titleEn: 'Arabic 101',
  titleAr: 'عربي 101',
  slug:    'arabic-101',
}

beforeEach(() => {
  jest.clearAllMocks()
  // Happy-path defaults — all tests that deviate override these
  mockEnrollmentFindUnique.mockResolvedValue({ id: 'enroll-1' })
  mockLessonCount.mockResolvedValue(5)
  mockLessonProgressCount.mockResolvedValue(5)
  mockCertificateFindUnique.mockResolvedValue(null)          // no existing cert
  mockCourseFindUnique.mockResolvedValue(COURSE_ROW)
  mockCertificateCreate.mockResolvedValue(CERT_ROW)
  mockCreateNotification.mockResolvedValue(undefined)
  mockCertificateFindMany.mockResolvedValue([])
})

// ═══════════════════════════════════════════════════════════════════════════════
// Custom error classes
// ═══════════════════════════════════════════════════════════════════════════════

describe('NotEnrolledError', () => {
  it('is an instance of Error', () => {
    expect(new NotEnrolledError()).toBeInstanceOf(Error)
  })

  it('has name "NotEnrolledError"', () => {
    expect(new NotEnrolledError().name).toBe('NotEnrolledError')
  })

  it('has a descriptive message', () => {
    expect(new NotEnrolledError().message).toMatch(/enrolled/i)
  })
})

describe('CourseNotCompleteError', () => {
  it('is an instance of Error', () => {
    expect(new CourseNotCompleteError(10, 7)).toBeInstanceOf(Error)
  })

  it('has name "CourseNotCompleteError"', () => {
    expect(new CourseNotCompleteError(10, 7).name).toBe('CourseNotCompleteError')
  })

  it('exposes total and completed properties', () => {
    const err = new CourseNotCompleteError(10, 7)
    expect(err.total).toBe(10)
    expect(err.completed).toBe(7)
  })

  it('message contains progress info', () => {
    const err = new CourseNotCompleteError(10, 7)
    expect(err.message).toContain('7')
    expect(err.message).toContain('10')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// checkCompletion
// ═══════════════════════════════════════════════════════════════════════════════

describe('checkCompletion', () => {
  it('returns total and completed counts from the DB', async () => {
    mockLessonCount.mockResolvedValue(8)
    mockLessonProgressCount.mockResolvedValue(8)
    const result = await checkCompletion('user-1', 'course-1')
    expect(result.total).toBe(8)
    expect(result.completed).toBe(8)
  })

  it('isComplete is true when completed equals total and total > 0', async () => {
    mockLessonCount.mockResolvedValue(5)
    mockLessonProgressCount.mockResolvedValue(5)
    const result = await checkCompletion('user-1', 'course-1')
    expect(result.isComplete).toBe(true)
  })

  it('isComplete is false when completed < total', async () => {
    mockLessonCount.mockResolvedValue(5)
    mockLessonProgressCount.mockResolvedValue(3)
    const result = await checkCompletion('user-1', 'course-1')
    expect(result.isComplete).toBe(false)
  })

  it('isComplete is false when total is 0 (empty course)', async () => {
    mockLessonCount.mockResolvedValue(0)
    mockLessonProgressCount.mockResolvedValue(0)
    const result = await checkCompletion('user-1', 'course-1')
    expect(result.isComplete).toBe(false)
  })

  it('queries only published lessons', async () => {
    await checkCompletion('user-1', 'course-1')
    expect(mockLessonCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isPublished: true }),
      }),
    )
  })

  it('runs lesson.count and lessonProgress.count in parallel (both called once)', async () => {
    await checkCompletion('user-1', 'course-1')
    expect(mockLessonCount).toHaveBeenCalledTimes(1)
    expect(mockLessonProgressCount).toHaveBeenCalledTimes(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// issueCertificate — guard clauses
// ═══════════════════════════════════════════════════════════════════════════════

describe('issueCertificate — guard clauses', () => {
  it('throws NotEnrolledError when the user is not enrolled', async () => {
    mockEnrollmentFindUnique.mockResolvedValue(null)
    await expect(issueCertificate('user-1', 'course-1'))
      .rejects.toBeInstanceOf(NotEnrolledError)
  })

  it('throws CourseNotCompleteError when not all lessons are done', async () => {
    mockLessonCount.mockResolvedValue(10)
    mockLessonProgressCount.mockResolvedValue(7)
    await expect(issueCertificate('user-1', 'course-1'))
      .rejects.toBeInstanceOf(CourseNotCompleteError)
  })

  it('CourseNotCompleteError carries the correct counts', async () => {
    mockLessonCount.mockResolvedValue(10)
    mockLessonProgressCount.mockResolvedValue(7)
    try {
      await issueCertificate('user-1', 'course-1')
    } catch (err) {
      expect(err).toBeInstanceOf(CourseNotCompleteError)
      const e = err as CourseNotCompleteError
      expect(e.total).toBe(10)
      expect(e.completed).toBe(7)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// issueCertificate — idempotency
// ═══════════════════════════════════════════════════════════════════════════════

describe('issueCertificate — idempotency', () => {
  it('returns the existing certificate without creating a new one', async () => {
    mockCertificateFindUnique.mockResolvedValue(CERT_ROW)

    const result = await issueCertificate('user-1', 'course-1')

    expect(result).toBe(CERT_ROW)
    expect(mockCertificateCreate).not.toHaveBeenCalled()
  })

  it('does not fire a notification when a certificate already exists', async () => {
    mockCertificateFindUnique.mockResolvedValue(CERT_ROW)
    await issueCertificate('user-1', 'course-1')
    expect(mockCreateNotification).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// issueCertificate — happy path (new certificate)
// ═══════════════════════════════════════════════════════════════════════════════

describe('issueCertificate — new certificate', () => {
  it('creates a certificate with the correct userId and courseId', async () => {
    await issueCertificate('user-1', 'course-1')
    expect(mockCertificateCreate).toHaveBeenCalledWith({
      data: { userId: 'user-1', courseId: 'course-1' },
    })
  })

  it('returns the newly created certificate', async () => {
    const result = await issueCertificate('user-1', 'course-1')
    expect(result).toBe(CERT_ROW)
  })

  it('fires a CERTIFICATE_ISSUED notification (fire-and-forget)', async () => {
    await issueCertificate('user-1', 'course-1')
    // createNotification is called asynchronously — wait a tick
    await Promise.resolve()
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type:   'CERTIFICATE_ISSUED',
      }),
    )
  })

  it('notification includes course title in Arabic and English', async () => {
    await issueCertificate('user-1', 'course-1')
    await Promise.resolve()
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        titleEn: expect.stringContaining('Arabic 101'),
        titleAr: expect.stringContaining('عربي 101'),
      }),
    )
  })

  it('notification includes a link to the certificate', async () => {
    await issueCertificate('user-1', 'course-1')
    await Promise.resolve()
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        link: expect.stringContaining(CERT_ROW.code),
      }),
    )
  })

  it('still returns the cert even if the course lookup returns null (graceful)', async () => {
    mockCourseFindUnique.mockResolvedValue(null)
    const result = await issueCertificate('user-1', 'course-1')
    expect(result).toBe(CERT_ROW)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// getUserCertificates
// ═══════════════════════════════════════════════════════════════════════════════

describe('getUserCertificates', () => {
  const CERT_LIST = [
    {
      id: 'c1', code: 'CODE1', issuedAt: new Date(),
      course: { slug: 'arabic-101', titleEn: 'Arabic 101', titleAr: 'عربي 101' },
    },
    {
      id: 'c2', code: 'CODE2', issuedAt: new Date(),
      course: { slug: 'arabic-102', titleEn: 'Arabic 102', titleAr: 'عربي 102' },
    },
  ]

  beforeEach(() => {
    mockCertificateFindMany.mockResolvedValue(CERT_LIST)
  })

  it('returns all certificates for the given user', async () => {
    const certs = await getUserCertificates('user-1')
    expect(certs).toHaveLength(2)
  })

  it('queries by userId', async () => {
    await getUserCertificates('user-1')
    expect(mockCertificateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
      }),
    )
  })

  it('orders results by issuedAt descending (newest first)', async () => {
    await getUserCertificates('user-1')
    expect(mockCertificateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { issuedAt: 'desc' },
      }),
    )
  })

  it('returns an empty array when the user has no certificates', async () => {
    mockCertificateFindMany.mockResolvedValue([])
    const certs = await getUserCertificates('user-no-certs')
    expect(certs).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// getCertificateByCode
// ═══════════════════════════════════════════════════════════════════════════════

describe('getCertificateByCode', () => {
  const CERT_DETAIL = {
    code:     'CERT-ABC123',
    issuedAt: new Date('2024-06-15T12:00:00Z'),
    user:   { name: 'Alice Smith' },
    course: { titleEn: 'Arabic 101', titleAr: 'عربي 101', slug: 'arabic-101' },
  }

  it('returns the certificate when found', async () => {
    mockCertificateFindUnique.mockResolvedValue(CERT_DETAIL)
    const cert = await getCertificateByCode('CERT-ABC123')
    expect(cert).toBe(CERT_DETAIL)
  })

  it('queries by the exact code', async () => {
    mockCertificateFindUnique.mockResolvedValue(CERT_DETAIL)
    await getCertificateByCode('CERT-ABC123')
    expect(mockCertificateFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: 'CERT-ABC123' },
      }),
    )
  })

  it('returns null when the code is not found', async () => {
    mockCertificateFindUnique.mockResolvedValue(null)
    const cert = await getCertificateByCode('NONEXISTENT')
    expect(cert).toBeNull()
  })
})
