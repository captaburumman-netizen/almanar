/**
 * Lesson player — /[locale]/courses/[slug]/learn?lesson=[lessonSlug]
 *
 * Access control:
 *   - Auth required (enforced by (protected) layout)
 *   - User must be enrolled OR the course must be free (auto-enrolled on visit)
 *   - Member-only courses require an active subscription
 *
 * Video delivery:
 *   - Signed S3 URLs generated server-side (1 hour TTL)
 *   - Raw s3Key is NEVER sent to the client
 */
import { notFound, redirect }    from 'next/navigation'
import { getServerSession }      from 'next-auth'
import { Link }                  from '@/i18n/navigation'
import { authOptions }           from '@/lib/auth'
import { db }                    from '@/lib/db'
import { getSignedDownloadUrl }  from '@/lib/s3'
import { getField } from '@/lib/utils'
import type { Locale }           from '@/i18n/routing'
import { VideoPlayer }           from '@/components/learn/VideoPlayer'
import { LessonSidebar }         from '@/components/learn/LessonSidebar'
import { MarkCompleteButton }    from '@/components/learn/MarkCompleteButton'

export const dynamic = 'force-dynamic'

interface LearnPageProps {
  params:      Promise<{ locale: Locale; slug: string }>
  searchParams: Promise<{ lesson?: string }>
}

export async function generateMetadata({ params }: LearnPageProps) {
  const { locale, slug } = await params
  const course = await db.course
    .findUnique({ where: { slug }, select: { titleEn: true, titleAr: true } })
    .catch(() => null)
  if (!course) return {}
  const title = locale === 'ar' ? course.titleAr : course.titleEn
  return { title: `${title} — ${locale === 'ar' ? 'التعلم' : 'Learn'}` }
}

export default async function LearnPage({ params, searchParams }: LearnPageProps) {
  const { locale, slug }         = await params
  const { lesson: lessonSlugParam } = await searchParams
  const isAr                     = locale === 'ar'

  const session = await getServerSession(authOptions)
  // (protected) layout guarantees session, but TypeScript needs this guard
  if (!session?.user?.id) redirect(`/${locale}/auth/signin`)
  const userId = session.user.id

  // ── Load course + all published lessons ─────────────────────────────────
  const course = await db.course.findUnique({
    where:  { slug, isPublished: true },
    select: {
      id:          true,
      slug:        true,
      titleEn:     true,
      titleAr:     true,
      price:       true,
      isMemberOnly: true,
      lessons: {
        where:   { isPublished: true },
        orderBy: { position: 'asc' },
        select: {
          id:           true,
          slug:         true,
          titleEn:      true,
          titleAr:      true,
          descriptionEn: true,
          descriptionAr: true,
          s3Key:        true,
          duration:     true,
          isPreview:    true,
          position:     true,
        },
      },
    },
  }).catch(() => null)

  if (!course || course.lessons.length === 0) notFound()

  // ── Enrollment check ────────────────────────────────────────────────────
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  }).catch(() => null)

  const isFree = Number(course.price) === 0 && !course.isMemberOnly

  if (!enrollment) {
    if (isFree) {
      // Auto-enroll students into free courses on first visit
      await db.enrollment.create({
        data: { userId, courseId: course.id, accessType: 'FREE' },
      }).catch(() => null) // ignore race-condition duplicates
    } else {
      // Paid or member-only course — redirect to course detail to purchase/subscribe
      redirect(`/${locale}/courses/${slug}`)
    }
  }

  // ── Resolve active lesson ───────────────────────────────────────────────
  const activeLesson = lessonSlugParam
    ? (course.lessons.find((l) => l.slug === lessonSlugParam) ?? course.lessons[0]!)
    : course.lessons[0]!

  // ── Generate signed video URL (server-side only) ─────────────────────────
  let videoUrl: string | null = null
  if (activeLesson.s3Key) {
    videoUrl = await getSignedDownloadUrl(activeLesson.s3Key, 3600).catch(() => null)
  }

  // ── Load completion progress ────────────────────────────────────────────
  const completedIds: Set<string> = await db.lessonProgress
    .findMany({
      where:  { userId, lesson: { courseId: course.id } },
      select: { lessonId: true },
    })
    .then((rows) => new Set(rows.map((r) => r.lessonId)))
    .catch(() => new Set<string>())

  // ── Derived values ──────────────────────────────────────────────────────
  const courseTitle = getField(course, 'title', locale)
  const lessonTitle = getField(activeLesson, 'title', locale)
  const lessonDesc  = getField(activeLesson, 'description', locale)
  const isCompleted = completedIds.has(activeLesson.id)

  const activeLessonIndex = course.lessons.findIndex((l) => l.id === activeLesson.id)
  const prevLesson        = course.lessons[activeLessonIndex - 1] ?? null
  const nextLesson        = course.lessons[activeLessonIndex + 1] ?? null

  // Shape data for sidebar (no s3Key sent to client)
  const sidebarLessons = course.lessons.map((l) => ({
    id:        l.id,
    slug:      l.slug,
    title:     getField(l, 'title', locale),
    position:  l.position,
    duration:  l.duration,
    completed: completedIds.has(l.id),
  }))

  return (
    <div className="flex min-h-screen flex-col bg-background">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container-brand flex h-14 items-center gap-3">
          {/* Back link */}
          <Link
            href={`/courses/${slug}` as `/courses/${string}`}
            className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label={isAr ? 'العودة إلى الدورة' : 'Back to course'}
          >
            <svg
              className="h-4 w-4 rtl:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">{isAr ? 'الدورة' : 'Course'}</span>
          </Link>

          <span className="text-border" aria-hidden>|</span>

          {/* Course title */}
          <p className="flex-1 truncate text-sm font-medium text-foreground">
            {courseTitle}
          </p>

          {/* Progress summary */}
          <p className="hidden sm:block shrink-0 text-xs text-muted-foreground">
            {completedIds.size} / {course.lessons.length}{' '}
            {isAr ? 'مكتمل' : 'completed'}
          </p>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1">

        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-72 shrink-0 border-e border-border">
          <div className="h-full py-4 px-3">
            <LessonSidebar
              lessons={sidebarLessons}
              activeLessonSlug={activeLesson.slug}
              courseSlug={slug}
              locale={locale}
            />
          </div>
        </aside>

        {/* Main lesson content */}
        <main className="flex-1 min-w-0 py-6 px-4 sm:px-6 lg:px-8 space-y-6">

          {/* Video player */}
          <VideoPlayer
            src={videoUrl}
            title={lessonTitle}
            lessonId={activeLesson.id}
            locale={locale}
          />

          {/* Lesson header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1 min-w-0">
              <p className="text-xs text-muted-foreground">
                {isAr ? 'درس' : 'Lesson'} {activeLesson.position}
                {activeLesson.duration && (
                  <span className="ms-2">
                    · {Math.ceil(activeLesson.duration / 60)}{' '}
                    {isAr ? 'دقيقة' : 'min'}
                  </span>
                )}
              </p>
              <h1 className="text-xl font-bold text-foreground leading-snug">
                {lessonTitle}
              </h1>
            </div>

            <MarkCompleteButton
              lessonId={activeLesson.id}
              initialCompleted={isCompleted}
              locale={locale}
            />
          </div>

          {/* Description */}
          {lessonDesc && (
            <div className="prose prose-warm max-w-none">
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line text-sm">
                {lessonDesc}
              </p>
            </div>
          )}

          {/* Prev / Next lesson navigation */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
            {prevLesson ? (
              <Link
                href={`/courses/${slug}/learn?lesson=${prevLesson.slug}` as `/courses/${string}/learn`}
                className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors max-w-[45%]"
              >
                <svg
                  className="h-4 w-4 shrink-0 rtl:rotate-180 group-hover:-translate-x-0.5 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="truncate">{getField(prevLesson, 'title', locale)}</span>
              </Link>
            ) : (
              <span />
            )}

            {nextLesson && (
              <Link
                href={`/courses/${slug}/learn?lesson=${nextLesson.slug}` as `/courses/${string}/learn`}
                className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors max-w-[45%] ms-auto"
              >
                <span className="truncate">{getField(nextLesson, 'title', locale)}</span>
                <svg
                  className="h-4 w-4 shrink-0 rtl:rotate-180 group-hover:translate-x-0.5 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>

          {/* Mobile lesson list */}
          <div className="lg:hidden pt-2">
            <LessonSidebar
              lessons={sidebarLessons}
              activeLessonSlug={activeLesson.slug}
              courseSlug={slug}
              locale={locale}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
