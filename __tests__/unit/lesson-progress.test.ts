/**
 * Unit tests — Lesson Progress API (POST + DELETE)
 *
 * Covers:
 *   POST /api/lessons/[lessonId]/progress
 *     - Auth guard
 *     - 404 when lesson not found
 *     - 403 when user not enrolled
 *     - Mark lesson complete (no course completion)
 *     - Course completion detected → stamps enrollment + sends email
 *     - Course already completed → no duplicate email
 *
 *   DELETE /api/lessons/[lessonId]/progress
 *     - Auth guard
 *     - Deletes progress row
 *     - Clears enrollment.completedAt
 */
import { NextRequest } from 'next/server'

// ─── Mock declarations ────────────────────────────────────────────────────────

const mockGetServerSession = jest.fn()

const mockLessonFindUnique    = jest.fn()
const mockEnrollmentFindUnique = jest.fn()
const mockEnrollmentUpdate    = jest.fn()
const mockEnrollmentUpdateMany = jest.fn()
const mockLessonProgressUpsert = jest.fn()
const mockLessonProgressDeleteMany = jest.fn()
const mockLessonCount         = jest.fn()
const mockLessonProgressCount = jest.fn()
const mockUserFindUnique      = jest.fn()
const mockCourseFindUnique    = jest.fn()

const mockSendEmail = jest.fn().mockResolvedValue(true)

// ─── jest.mock ────────────────────────────────────────────────────────────────

jest.mock('next-auth', () => ({
  getServerSession: (...a: unknown[]) => mockGetServerSession(...a),
}))

jest.mock('@/lib/auth', () => ({ authOptions: {} }))

jest.mock('@/lib/db', () => ({
  db: {
    lesson: {
      findUnique: (...a: unknown[]) => mockLessonFindUnique(...a),
      count:      (...a: unknown[]) => mockLessonCount(...a),
    },
    enrollment: {
      findUnique:  (...a: unknown[]) => mockEnrollmentFindUnique(...a),
      update:      (...a: unknown[]) => mockEnrollmentUpdate(...a),
      updateMany:  (...a: unknown[]) => mockEnrollmentUpdateMany(...a),
    },
    lessonProgress: {
      upsert:     (...a: unknown[]) => mockLessonProgressUpsert(...a),
      deleteMany: (...a: unknown[]) => mockLessonProgressDeleteMany(...a),
      count:      (...a: unknown[]) => mockLessonProgressCount(...a),
    },
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
    },
    course: {
      findUnique: (...a: unknown[]) => mockCourseFindUnique(...a),
    },
  },
}))

jest.mock('@/lib/resend', () => ({
  sendEmail: (...a: unknown[]) => mockSendEmail(...a),
}))

jest.mock('@/emails/CourseCompletionEmail', () => ({
  CourseCompletionEmail: jest.fn(),
}))

jest.mock('@/lib/utils', () => ({
  getField: (obj: Record<string, unknown>, field: string, locale: string) => {
    const key = locale === 'ar' ? `${field}Ar` : `${field}En`
    return (obj[key] ?? obj[`${field}En`] ?? '') as string
  },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_SESSION = { user: { id: 'user-1', role: 'STUDENT' } }

function makeReq(path: string, method = 'POST'): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, { method })
}

beforeEach(() => {
  jest.resetAllMocks()
  mockGetServerSession.mockResolvedValue(USER_SESSION)
  mockSendEmail.mockResolvedValue(true)
})

// Drain all microtasks so fire-and-forget async blocks settle
async function flushAsync() {
  await new Promise((r) => setTimeout(r, 10))
}

// ─── POST progress ────────────────────────────────────────────────────────────

describe('POST /api/lessons/[lessonId]/progress', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: (req: NextRequest, ctx: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/lessons/[lessonId]/progress/route')
    POST = mod.POST
  })

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValueOnce(null)
    const req = makeReq('/api/lessons/lesson-1/progress')
    const res = await POST(req, { params: Promise.resolve({ lessonId: 'lesson-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when lesson not found', async () => {
    mockLessonFindUnique.mockResolvedValueOnce(null)
    const req = makeReq('/api/lessons/ghost/progress')
    const res = await POST(req, { params: Promise.resolve({ lessonId: 'ghost' }) })
    expect(res.status).toBe(404)
  })

  it('returns 403 when user not enrolled', async () => {
    mockLessonFindUnique.mockResolvedValueOnce({ id: 'lesson-1', courseId: 'course-1' })
    mockEnrollmentFindUnique.mockResolvedValueOnce(null)

    const req = makeReq('/api/lessons/lesson-1/progress')
    const res = await POST(req, { params: Promise.resolve({ lessonId: 'lesson-1' }) })
    expect(res.status).toBe(403)
  })

  it('marks lesson complete and returns 200 with courseCompleted=false when course not done', async () => {
    mockLessonFindUnique.mockResolvedValueOnce({ id: 'lesson-1', courseId: 'course-1' })
    mockEnrollmentFindUnique.mockResolvedValueOnce({ id: 'enroll-1', completedAt: null })
    mockLessonProgressUpsert.mockResolvedValueOnce({})
    mockLessonCount.mockResolvedValueOnce(5)         // 5 total lessons
    mockLessonProgressCount.mockResolvedValueOnce(3) // only 3 completed

    const req = makeReq('/api/lessons/lesson-1/progress')
    const res = await POST(req, { params: Promise.resolve({ lessonId: 'lesson-1' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.completed).toBe(true)
    expect(json.courseCompleted).toBe(false)
  })

  it('detects course completion when all lessons done — stamps enrollment', async () => {
    mockLessonFindUnique.mockResolvedValueOnce({ id: 'lesson-5', courseId: 'course-1' })
    mockEnrollmentFindUnique.mockResolvedValueOnce({ id: 'enroll-1', completedAt: null })
    mockLessonProgressUpsert.mockResolvedValueOnce({})
    mockLessonCount.mockResolvedValueOnce(5)         // 5 total lessons
    mockLessonProgressCount.mockResolvedValueOnce(5) // all 5 completed
    mockEnrollmentUpdate.mockResolvedValueOnce({})
    // For fire-and-forget email
    mockUserFindUnique.mockResolvedValueOnce({
      email: 'student@example.com', name: 'Ahmed', preferredLocale: 'ar',
    })
    mockCourseFindUnique.mockResolvedValueOnce({
      titleEn: 'Parenting 101', titleAr: 'تربية الأطفال', slug: 'parenting-101',
    })

    const req = makeReq('/api/lessons/lesson-5/progress')
    const res = await POST(req, { params: Promise.resolve({ lessonId: 'lesson-5' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.courseCompleted).toBe(true)

    // Enrollment was stamped
    expect(mockEnrollmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ completedAt: expect.any(Date) }) })
    )

    // Allow fire-and-forget to complete
    await flushAsync()
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    const emailCall = mockSendEmail.mock.calls[0][0]
    expect(emailCall.to).toBe('student@example.com')
    expect(emailCall.subject).toMatch(/تهانينا/)  // Arabic subject
  })

  it('sends English completion email when locale is en', async () => {
    mockLessonFindUnique.mockResolvedValueOnce({ id: 'lesson-5', courseId: 'course-1' })
    mockEnrollmentFindUnique.mockResolvedValueOnce({ id: 'enroll-1', completedAt: null })
    mockLessonProgressUpsert.mockResolvedValueOnce({})
    mockLessonCount.mockResolvedValueOnce(3)
    mockLessonProgressCount.mockResolvedValueOnce(3)
    mockEnrollmentUpdate.mockResolvedValueOnce({})
    mockUserFindUnique.mockResolvedValueOnce({
      email: 'student@example.com', name: 'Sarah', preferredLocale: 'en',
    })
    mockCourseFindUnique.mockResolvedValueOnce({
      titleEn: 'Parenting 101', titleAr: 'تربية الأطفال', slug: 'parenting-101',
    })

    const req = makeReq('/api/lessons/lesson-5/progress')
    await POST(req, { params: Promise.resolve({ lessonId: 'lesson-5' }) })
    await flushAsync()

    const emailCall = mockSendEmail.mock.calls[0][0]
    expect(emailCall.subject).toMatch(/Congratulations/)
  })

  it('does not send email when enrollment is already completed', async () => {
    mockLessonFindUnique.mockResolvedValueOnce({ id: 'lesson-1', courseId: 'course-1' })
    mockEnrollmentFindUnique.mockResolvedValueOnce({ id: 'enroll-1', completedAt: new Date() }) // already done
    mockLessonProgressUpsert.mockResolvedValueOnce({})

    const req = makeReq('/api/lessons/lesson-1/progress')
    const res = await POST(req, { params: Promise.resolve({ lessonId: 'lesson-1' }) })
    await flushAsync()

    expect(res.status).toBe(200)
    // Should not check completion or send email
    expect(mockLessonCount).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('does not send email when user lookup returns null', async () => {
    mockLessonFindUnique.mockResolvedValueOnce({ id: 'lesson-3', courseId: 'course-1' })
    mockEnrollmentFindUnique.mockResolvedValueOnce({ id: 'enroll-1', completedAt: null })
    mockLessonProgressUpsert.mockResolvedValueOnce({})
    mockLessonCount.mockResolvedValueOnce(3)
    mockLessonProgressCount.mockResolvedValueOnce(3)
    mockEnrollmentUpdate.mockResolvedValueOnce({})
    mockUserFindUnique.mockResolvedValueOnce(null) // user not found
    mockCourseFindUnique.mockResolvedValueOnce({
      titleEn: 'Course', titleAr: 'دورة', slug: 'course',
    })

    const req = makeReq('/api/lessons/lesson-3/progress')
    await POST(req, { params: Promise.resolve({ lessonId: 'lesson-3' }) })
    await flushAsync()

    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})

// ─── DELETE progress ──────────────────────────────────────────────────────────

describe('DELETE /api/lessons/[lessonId]/progress', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let DELETE: (req: NextRequest, ctx: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/lessons/[lessonId]/progress/route')
    DELETE = mod.DELETE
  })

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValueOnce(null)
    const req = makeReq('/api/lessons/lesson-1/progress', 'DELETE')
    const res = await DELETE(req, { params: Promise.resolve({ lessonId: 'lesson-1' }) })
    expect(res.status).toBe(401)
  })

  it('deletes progress row and returns ok', async () => {
    mockLessonFindUnique.mockResolvedValueOnce({ courseId: 'course-1' })
    mockLessonProgressDeleteMany.mockResolvedValueOnce({ count: 1 })
    mockEnrollmentUpdateMany.mockResolvedValueOnce({ count: 0 })

    const req = makeReq('/api/lessons/lesson-1/progress', 'DELETE')
    const res = await DELETE(req, { params: Promise.resolve({ lessonId: 'lesson-1' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.completed).toBe(false)
  })

  it('clears enrollment completedAt when un-marking a lesson', async () => {
    mockLessonFindUnique.mockResolvedValueOnce({ courseId: 'course-1' })
    mockLessonProgressDeleteMany.mockResolvedValueOnce({ count: 1 })
    mockEnrollmentUpdateMany.mockResolvedValueOnce({ count: 1 })

    const req = makeReq('/api/lessons/lesson-1/progress', 'DELETE')
    await DELETE(req, { params: Promise.resolve({ lessonId: 'lesson-1' }) })

    expect(mockEnrollmentUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { completedAt: null },
      })
    )
  })

  it('still returns ok when lesson lookup fails', async () => {
    mockLessonFindUnique.mockResolvedValueOnce(null) // lesson not found
    mockLessonProgressDeleteMany.mockResolvedValueOnce({ count: 0 })

    const req = makeReq('/api/lessons/unknown/progress', 'DELETE')
    const res = await DELETE(req, { params: Promise.resolve({ lessonId: 'unknown' }) })
    expect(res.status).toBe(200)
    // No enrollment update attempted when lesson not found
    expect(mockEnrollmentUpdateMany).not.toHaveBeenCalled()
  })
})
