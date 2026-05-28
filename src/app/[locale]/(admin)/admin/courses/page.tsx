/**
 * Admin courses list — /[locale]/admin/courses
 */
import { db }            from '@/lib/db'
import { Link }          from '@/i18n/navigation'
import { PublishToggle } from '@/components/admin/PublishToggle'
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
          <h1 className="text-2xl font-bold text-foreground">Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {courses.length} course{courses.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/admin/courses/new" className="btn-primary text-sm px-4 py-2 rounded-md">
          + New Course
        </Link>
      </div>

      {/* Table */}
      {courses.length === 0 ? (
        <div className="card-brand p-12 text-center">
          <p className="text-muted-foreground">No courses yet.</p>
          <Link href="/admin/courses/new" className="mt-4 inline-block text-sm text-primary hover:underline">
            Create your first course →
          </Link>
        </div>
      ) : (
        <div className="card-brand overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Lessons</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr
                  key={course.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{course.titleEn}</p>
                      <p className="text-xs text-muted-foreground">{course.titleAr}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {course.isMemberOnly
                      ? <span className="text-xs bg-warm-brown/10 text-warm-brown rounded px-1.5 py-0.5">Members</span>
                      : Number(course.price) === 0
                        ? 'Free'
                        : `$${Number(course.price).toFixed(2)}`
                    }
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {course.level.toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {course._count.lessons}
                  </td>
                  <td className="px-4 py-3">
                    <PublishToggle
                      id={course.id}
                      published={course.isPublished}
                      endpoint={`/api/admin/courses/${course.id}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/courses/${course.id}` as `/admin/courses/${string}`}
                      className="text-primary text-xs hover:underline"
                    >
                      Edit →
                    </Link>
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
