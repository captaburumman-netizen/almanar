/**
 * Course edit page — /[locale]/admin/courses/[courseId]
 *
 * Shows:
 *   1. Course edit form (CourseForm)
 *   2. Lesson list with reorder / publish toggles (LessonList)
 *   3. "Add lesson" CTA
 */
import { notFound }      from 'next/navigation'
import { db }            from '@/lib/db'
import { Link }          from '@/i18n/navigation'
import { CourseForm }    from '@/components/admin/CourseForm'
import { LessonList }    from '@/components/admin/LessonList'
import { PublishToggle } from '@/components/admin/PublishToggle'
import type { Locale }   from '@/i18n/routing'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ locale: Locale; courseId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { courseId } = await params
  const course = await db.course.findUnique({ where: { id: courseId }, select: { titleEn: true } })
  return { title: `${course?.titleEn ?? 'Course'} — ALMANAR Admin` }
}

export default async function EditCoursePage({ params }: Props) {
  const { locale, courseId } = await params

  const course = await db.course.findUnique({
    where:   { id: courseId },
    include: {
      lessons: {
        orderBy: { position: 'asc' },
        select: {
          id:          true,
          slug:        true,
          titleEn:     true,
          titleAr:     true,
          position:    true,
          isPreview:   true,
          isPublished: true,
          duration:    true,
          s3Key:       true,
        },
      },
    },
  })

  if (!course) notFound()

  const initial = {
    titleEn:         course.titleEn,
    titleAr:         course.titleAr,
    descriptionEn:   course.descriptionEn,
    descriptionAr:   course.descriptionAr,
    shortDescEn:     course.shortDescEn,
    shortDescAr:     course.shortDescAr,
    price:           String(course.price),
    isMemberOnly:    course.isMemberOnly,
    level:           course.level,
    categoryEn:      course.categoryEn ?? '',
    categoryAr:      course.categoryAr ?? '',
    thumbnail:       course.thumbnail ?? '',
    previewVideoUrl: course.previewVideoUrl ?? '',
    slug:            course.slug,
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/courses" className="hover:text-foreground">Courses</Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[240px]">{course.titleEn}</span>
      </div>

      {/* Course header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{course.titleEn}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{course.titleAr}</p>
        </div>
        <PublishToggle
          id={courseId}
          published={course.isPublished}
          endpoint={`/api/admin/courses/${courseId}`}
        />
      </div>

      {/* Course edit form */}
      <section aria-labelledby="course-form-heading">
        <h2 id="course-form-heading" className="text-base font-semibold text-foreground mb-4">
          Course Details
        </h2>
        <CourseForm locale={locale} courseId={courseId} initial={initial} />
      </section>

      {/* Lessons */}
      <section aria-labelledby="lessons-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="lessons-heading" className="text-base font-semibold text-foreground">
            Lessons ({course.lessons.length})
          </h2>
          <Link
            href={`/admin/courses/${courseId}/lessons/new` as `/admin/courses/${string}/lessons/new`}
            className="btn-primary text-sm px-3 py-1.5 rounded-md"
          >
            + Add Lesson
          </Link>
        </div>
        <LessonList
          courseId={courseId}
          locale={locale}
          lessons={course.lessons}
        />
      </section>

      {/* Danger zone */}
      <section className="card-brand p-5 border-destructive/30 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Danger Zone</h2>
        <p className="text-xs text-muted-foreground">
          Deleting a course will cascade-delete all lessons and remove all enrollments.
        </p>
        <DeleteCourseButton courseId={courseId} locale={locale} />
      </section>
    </div>
  )
}

// ─── Delete button (client-side) ──────────────────────────────────────────────
// Defined here since it's small and course-specific

import { DeleteCourseButton } from '@/components/admin/DeleteCourseButton'
