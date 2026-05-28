/**
 * POST /api/lessons/[lessonId]/progress
 *
 * Marks a lesson as completed for the authenticated user.
 * Idempotent — calling it multiple times has no side-effects.
 *
 * After marking complete, checks whether ALL published lessons in the course
 * are now done. If so:
 *   1. Sets enrollment.completedAt
 *   2. Fires a completion email (fire-and-forget)
 *
 * Returns: { completed: true, lessonId, courseCompleted: boolean }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession }          from 'next-auth'
import * as React                    from 'react'
import { authOptions }               from '@/lib/auth'
import { db }                        from '@/lib/db'
import { sendEmail }                 from '@/lib/resend'
import { CourseCompletionEmail }     from '@/emails/CourseCompletionEmail'
import { getField }                  from '@/lib/utils'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface RouteContext {
  params: Promise<{ lessonId: string }>
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const { lessonId } = await params

  // Verify the lesson exists and the user is enrolled in its course
  const lesson = await db.lesson.findUnique({
    where:  { id: lessonId },
    select: { id: true, courseId: true },
  }).catch(() => null)

  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  // Verify enrollment
  const enrollment = await db.enrollment.findUnique({
    where:  { userId_courseId: { userId, courseId: lesson.courseId } },
    select: { id: true, completedAt: true },
  }).catch(() => null)

  if (!enrollment) {
    return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 })
  }

  // Upsert progress — idempotent
  await db.lessonProgress.upsert({
    where:  { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId },
    update: { completedAt: new Date() },
  })

  // ── Course completion check ─────────────────────────────────────────────
  let courseCompleted = false

  if (!enrollment.completedAt) {
    // Count published lessons vs completed lesson-progress rows for this course
    const [totalLessons, completedLessons] = await Promise.all([
      db.lesson.count({ where: { courseId: lesson.courseId, isPublished: true } }),
      db.lessonProgress.count({
        where: { userId, lesson: { courseId: lesson.courseId } },
      }),
    ])

    if (totalLessons > 0 && completedLessons >= totalLessons) {
      courseCompleted = true

      // Stamp enrollment as complete
      await db.enrollment.update({
        where: { id: enrollment.id },
        data:  { completedAt: new Date() },
      }).catch(() => null)

      // Fire-and-forget: send completion email
      void (async () => {
        try {
          const [user, course] = await Promise.all([
            db.user.findUnique({
              where:  { id: userId },
              select: { email: true, name: true, preferredLocale: true },
            }),
            db.course.findUnique({
              where:  { id: lesson.courseId },
              select: { titleEn: true, titleAr: true, slug: true },
            }),
          ])

          if (!user?.email || !course) return

          const locale      = (user.preferredLocale ?? 'ar') as 'ar' | 'en'
          const courseTitle = getField(course, 'title', locale)
          const isAr        = locale === 'ar'

          await sendEmail({
            to:      user.email,
            subject: isAr
              ? `تهانينا! أتممت دورة "${courseTitle}"`
              : `Congratulations! You completed "${courseTitle}"`,
            react: React.createElement(CourseCompletionEmail, {
              name:        user.name ?? (isAr ? 'طالب' : 'Student'),
              courseTitle,
              courseSlug:  course.slug,
              locale,
              appUrl:      APP_URL,
            }),
          })
        } catch {
          // Non-fatal — progress is already saved
        }
      })()
    }
  }

  return NextResponse.json({ completed: true, lessonId, courseCompleted })
}

/**
 * DELETE /api/lessons/[lessonId]/progress
 *
 * Un-marks a lesson as completed (allows re-watching / resetting progress).
 * Also clears enrollment.completedAt so the course can be re-completed.
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const { lessonId } = await params

  // Look up the lesson to find its course
  const lesson = await db.lesson.findUnique({
    where:  { id: lessonId },
    select: { courseId: true },
  }).catch(() => null)

  await db.lessonProgress.deleteMany({
    where: { userId, lessonId },
  }).catch(() => null)

  // Clear course-completion stamp if the lesson belongs to a course
  if (lesson) {
    await db.enrollment.updateMany({
      where: { userId, courseId: lesson.courseId, completedAt: { not: null } },
      data:  { completedAt: null },
    }).catch(() => null)
  }

  return NextResponse.json({ completed: false, lessonId })
}
