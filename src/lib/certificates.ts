/**
 * Certificate utilities
 *
 * issueCertificate  — create (or return existing) certificate for a completed course
 * checkCompletion   — count total vs completed lessons for a user in a course
 * getUserCertificates — fetch all certificates for a user
 * getCertificateByCode — fetch a single certificate by its public code
 */
import { db }                 from '@/lib/db'
import { createNotification } from '@/lib/notifications'

// ─── Completion check ────────────────────────────────────────────────────────

export interface CompletionStatus {
  total:      number
  completed:  number
  isComplete: boolean
}

export async function checkCompletion(
  userId:   string,
  courseId: string,
): Promise<CompletionStatus> {
  const [total, completed] = await Promise.all([
    db.lesson.count({ where: { courseId, isPublished: true } }),
    db.lessonProgress.count({
      where: {
        userId,
        lesson: { courseId },
      },
    }),
  ])

  return {
    total,
    completed,
    isComplete: total > 0 && completed >= total,
  }
}

// ─── Issue (idempotent) ───────────────────────────────────────────────────────

export class CourseNotCompleteError extends Error {
  constructor(
    public readonly total:     number,
    public readonly completed: number,
  ) {
    super(`Course not complete: ${completed}/${total} lessons done`)
    this.name = 'CourseNotCompleteError'
  }
}

export class NotEnrolledError extends Error {
  constructor() {
    super('User is not enrolled in this course')
    this.name = 'NotEnrolledError'
  }
}

export async function issueCertificate(
  userId:   string,
  courseId: string,
) {
  // 1. Must be enrolled
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  })
  if (!enrollment) throw new NotEnrolledError()

  // 2. Must have completed all published lessons
  const { total, completed, isComplete } = await checkCompletion(userId, courseId)
  if (!isComplete) throw new CourseNotCompleteError(total, completed)

  // 3. Upsert certificate (idempotent)
  const existing = await db.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  if (existing) return existing

  // Need course title for notification — fetch it
  const course = await db.course.findUnique({
    where:  { id: courseId },
    select: { titleEn: true, titleAr: true, slug: true },
  })

  const cert = await db.certificate.create({
    data: { userId, courseId },
  })

  // Fire-and-forget notification
  void createNotification({
    userId,
    type:    'CERTIFICATE_ISSUED',
    titleEn: `Certificate issued: ${course?.titleEn ?? 'Course'}`,
    titleAr: `تم إصدار شهادة: ${course?.titleAr ?? 'الدورة'}`,
    bodyEn:  'Your certificate is ready. Share it or download it.',
    bodyAr:  'شهادتك جاهزة. شاركها أو احتفظ بها.',
    link:    `/en/certificates/${cert.code}`,
  })

  return cert
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getUserCertificates(userId: string) {
  return db.certificate.findMany({
    where:   { userId },
    orderBy: { issuedAt: 'desc' },
    select: {
      id:       true,
      code:     true,
      issuedAt: true,
      course: {
        select: {
          slug:    true,
          titleEn: true,
          titleAr: true,
        },
      },
    },
  })
}

export async function getCertificateByCode(code: string) {
  return db.certificate.findUnique({
    where:  { code },
    select: {
      code:     true,
      issuedAt: true,
      user: {
        select: { name: true },
      },
      course: {
        select: {
          titleEn: true,
          titleAr: true,
          slug:    true,
        },
      },
    },
  })
}
