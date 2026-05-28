/**
 * Admin courses list — /[locale]/admin/courses
 */
import { db }            from '@/lib/db'
import { Link }          from '@/i18n/navigation'
import { PublishToggle } from '@/components/admin/PublishToggle'
import { DeleteCourseButton } from '@/components/admin/DeleteCourseButton'
import type { Locale }   from '@/i18n/routing'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'Courses — ALMANAR Admin' }
}

export default async function AdminCoursesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  await params

  const courses = await db.course.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id:           true,
      slug:         true,
      titleEn:      true,
      titleAr:      true,
      price:        true,
      isPublished:  true,
      isMemberOnly: true,
      level:        true,
      _count: {
        select: { lessons: true },
      },
    },
  })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Courses</h1>
          <p className="mt-1 text-sm text-stone-500">
            {courses.length} course{courses.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/courses/new"
          className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 transition-colors cursor-pointer"
        >
          <span className="text-lg leading-none">+</span>
          New Course
        </Link>
      </div>

      {/* Empty state */}
      {courses.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
            <svg className="h-7 w-7 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <p className="text-base font-semibold text-stone-700">No courses yet</p>
          <p className="mt-1 text-sm text-stone-400">Create your first course to get started</p>
          <Link
            href="/admin/courses/new"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 transition-colors cursor-pointer"
          >
            <span className="text-lg leading-none">+</span>
            Create First Course
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr className="text-left text-stone-500">
                <th className="px-5 py-3.5 font-medium">Title</th>
                <th className="px-5 py-3.5 font-medium">Price</th>
                <th className="px-5 py-3.5 font-medium">Level</th>
                <th className="px-5 py-3.5 font-medium">Lessons</th>
                <th className="px-5 py-3.5 font-medium">Published</th>
                <th className="px-5 py-3.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-semibold text-stone-900">{course.titleEn}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{course.titleAr}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-stone-600">
                    {course.isMemberOnly
                      ? <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">Members</span>
                      : Number(course.price) === 0
                        ? <span className="text-emerald-600 font-medium">Free</span>
                        : `$${Number(course.price).toFixed(2)}`
                    }
                  </td>
                  <td className="px-5 py-4 text-stone-500 capitalize">
                    {course.level.toLowerCase()}
                  </td>
                  <td className="px-5 py-4 text-stone-500">
                    {course._count.lessons} lesson{course._count.lessons !== 1 ? 's' : ''}
                  </td>
                  <td className="px-5 py-4">
                    <PublishToggle
                      id={course.id}
                      published={course.isPublished}
                      endpoint={`/api/admin/courses/${course.id}`}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/courses/${course.id}` as `/admin/courses/${string}`}
                        className="rounded-md bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
                      >
                        Edit
                      </Link>
                      <DeleteCourseButton id={course.id} title={course.titleEn} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
