/**
 * GET /api/admin/stats — aggregate dashboard statistics
 *
 * Returns counts for courses, lessons, products, users, enrollments,
 * and recent purchase revenue.
 */
import { NextResponse }      from 'next/server'
import { requireAdminSession } from '@/lib/adminGuard'
import { db }                from '@/lib/db'

export async function GET() {
  const { error } = await requireAdminSession()
  if (error) return error

  const [
    totalCourses,
    publishedCourses,
    totalLessons,
    totalProducts,
    totalUsers,
    totalEnrollments,
    activeSubscriptions,
    recentRevenue,
  ] = await Promise.all([
    db.course.count(),
    db.course.count({ where: { isPublished: true } }),
    db.lesson.count(),
    db.product.count({ where: { isPublished: true } }),
    db.user.count({ where: { role: 'STUDENT' } }),
    db.enrollment.count(),
    db.subscription.count({ where: { status: 'ACTIVE' } }),
    // Revenue from completed purchases in last 30 days
    db.coursePurchase.aggregate({
      where: {
        status:    'COMPLETED',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      _sum: { amount: true },
    }),
  ])

  const productRevenue = await db.productPurchase.aggregate({
    where: {
      status:    'COMPLETED',
      isFree:    false,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    _sum: { amount: true },
  })

  const courseRev   = Number(recentRevenue._sum.amount ?? 0)
  const productRev  = Number(productRevenue._sum.amount ?? 0)
  const totalRevenue = courseRev + productRev

  return NextResponse.json({
    totalCourses,
    publishedCourses,
    totalLessons,
    totalProducts,
    totalUsers,
    totalEnrollments,
    activeSubscriptions,
    revenueThirtyDays: totalRevenue,
  })
}
