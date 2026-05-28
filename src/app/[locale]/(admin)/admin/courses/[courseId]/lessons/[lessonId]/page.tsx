/**
 * Edit lesson — /[locale]/admin/courses/[courseId]/lessons/[lessonId]
 */
import { notFound }    from 'next/navigation'
import { db }          from '@/lib/db'
import { Link }        from '@/i18n/navigation'
import { LessonForm }  from '@/components/admin/LessonForm'
import type { Locale } from '@/i18n/routing'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ locale: Locale; courseId: string; lessonId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { lessonId } = await params
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { titleEn: true } })
  return { title: `${lesson?.titleEn ?? 'Lesson'} — ALMANAR Admin` }
}

export default async function EditLessonPage({ params }: Props) {
  const { locale, courseId, lessonId } = await params

  const [course, lesson] = await Promise.all([
    db.course.findUnique({ where: { id: courseId }, select: { id: true, titleEn: true } }),
    db.lesson.findUnique({ where: { id: lessonId, courseId } }),
  ])
  if (!course || !lesson) notFound()

  const initial = {
    titleEn:       lesson.titleEn,
    titleAr:       lesson.titleAr,
    descriptionEn: lesson.descriptionEn ?? '',
    descriptionAr: lesson.descriptionAr ?? '',
    s3Key:         lesson.s3Key ?? '',
    duration:      lesson.duration != null ? String(lesson.duration) : '',
    isPreview:     lesson.isPreview,
    isPublished:   lesson.isPublished,
    slug:          lesson.slug,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <Link href="/admin/courses" className="hover:text-foreground">Courses</Link>
        <span>/</span>
        <Link href={`/admin/courses/${courseId}` as `/admin/courses/${string}`} className="hover:text-foreground truncate max-w-[140px]">
          {course.titleEn}
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[140px]">{lesson.titleEn}</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground">Edit Lesson</h1>
      <LessonForm locale={locale} courseId={courseId} lessonId={lessonId} initial={initial} />
    </div>
  )
}
