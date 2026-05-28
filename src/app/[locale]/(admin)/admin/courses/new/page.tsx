/**
 * New course page — /[locale]/admin/courses/new
 */
import { CourseForm } from '@/components/admin/CourseForm'
import { Link }       from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

export async function generateMetadata() {
  return { title: 'New Course — ALMANAR Admin' }
}

export default async function NewCoursePage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/courses" className="hover:text-foreground">Courses</Link>
        <span>/</span>
        <span className="text-foreground">New Course</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground">Create Course</h1>
      <CourseForm locale={locale} />
    </div>
  )
}
