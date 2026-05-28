/**
 * New lesson — /[locale]/admin/courses/[courseId]/lessons/new
 */
import { notFound }    from 'next/navigation'
import { db }          from '@/lib/db'
import { Link }        from '@/i18n/navigation'
import { LessonForm }  from '@/components/admin/LessonForm'
import type { Locale } from '@/i18n/routing'

export async function generateMetadata() {
  return { title: 'New Lesson — ALMANAR Admin' }
}

interface Props {
  params: Promise<{ locale: Locale; courseId: string }>
}

export default async function NewLessonPage({ params }: Props) {
  const { locale, courseId } = await params

  const course = await db.course.findUnique({
    where:  { id: courseId },
    select: { id: true, titleEn: true },
  })
  if (!course) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <Link href="/admin/courses" className="hover:text-foreground">Courses</Link>
        <span>/</span>
        <Link href={`/admin/courses/${courseId}` as `/admin/courses/${string}`} className="hover:text-foreground truncate max-w-[160px]">
          {course.titleEn}
        </Link>
        <span>/</span>
        <span className="text-foreground">New Lesson</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground">Add Lesson</h1>
      <LessonForm locale={locale} courseId={courseId} />
    </div>
  )
}
