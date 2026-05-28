/**
 * GET /api/admin/analytics
 *
 * Returns time-series data for the admin analytics dashboard:
 *   - Daily revenue (last 30 days)
 *   - Daily new user registrations (last 30 days)
 *   - Monthly enrollments (last 6 months)
 *   - Top 10 courses by total enrollment
 *   - Revenue breakdown by type (courses vs products)
 */
import { NextResponse }        from 'next/server'
import { requireAdminSession } from '@/lib/adminGuard'
import { db }                  from '@/lib/db'

export async function GET() {
  const { error } = await requireAdminSession()
  if (error) return error

  const now      = new Date()
  const day30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const day180ago = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

  // ── Raw purchase data for last 30 days ──────────────────────────────────────
  const [coursePurchases, productPurchases, newUsers, enrollments, topCourses] =
    await Promise.all([
      db.coursePurchase.findMany({
        where:   { status: 'COMPLETED', createdAt: { gte: day30ago } },
        select:  { amount: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      db.productPurchase.findMany({
        where:   { status: 'COMPLETED', isFree: false, createdAt: { gte: day30ago } },
        select:  { amount: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      db.user.findMany({
        where:   { createdAt: { gte: day30ago } },
        select:  { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      db.enrollment.findMany({
        where:   { createdAt: { gte: day180ago } },
        select:  { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      db.enrollment.groupBy({
        by:      ['courseId'],
        _count:  { courseId: true },
        orderBy: { _count: { courseId: 'desc' } },
        take:    10,
      }),
    ])

  // ── Daily revenue (last 30 days) ───────────────────────────────────────────
  const dailyRevenue = buildDailyBuckets(day30ago, now)
  for (const p of coursePurchases) {
    const key = toDateKey(p.createdAt)
    if (dailyRevenue[key] !== undefined) {
      dailyRevenue[key]! += Number(p.amount)
    }
  }
  for (const p of productPurchases) {
    const key = toDateKey(p.createdAt)
    if (dailyRevenue[key] !== undefined) {
      dailyRevenue[key]! += Number(p.amount)
    }
  }

  // ── Daily new users (last 30 days) ────────────────────────────────────────
  const dailyUsers = buildDailyBuckets(day30ago, now)
  for (const u of newUsers) {
    const key = toDateKey(u.createdAt)
    if (dailyUsers[key] !== undefined) dailyUsers[key]!++
  }

  // ── Monthly enrollments (last 6 months) ────────────────────────────────────
  const monthlyEnrollments = buildMonthlyBuckets(day180ago, now)
  for (const e of enrollments) {
    const key = toMonthKey(e.createdAt)
    if (monthlyEnrollments[key] !== undefined) monthlyEnrollments[key]!++
  }

  // ── Revenue totals ─────────────────────────────────────────────────────────
  const totalCourseRevenue  = coursePurchases.reduce((s, p) => s + Number(p.amount), 0)
  const totalProductRevenue = productPurchases.reduce((s, p) => s + Number(p.amount), 0)

  // ── Top courses with titles ───────────────────────────────────────────────
  const courseIds = topCourses.map((c) => c.courseId)
  const courseDetails = await db.course.findMany({
    where:  { id: { in: courseIds } },
    select: { id: true, titleEn: true, titleAr: true, slug: true },
  })
  const courseMap = Object.fromEntries(courseDetails.map((c) => [c.id, c]))

  const topCoursesWithTitles = topCourses.map((c) => ({
    courseId:    c.courseId,
    enrollments: c._count.courseId,
    titleEn:     courseMap[c.courseId]?.titleEn ?? 'Unknown',
    titleAr:     courseMap[c.courseId]?.titleAr ?? '',
    slug:        courseMap[c.courseId]?.slug ?? '',
  }))

  return NextResponse.json({
    dailyRevenue:        Object.entries(dailyRevenue).map(([date, revenue]) => ({ date, revenue })),
    dailyNewUsers:       Object.entries(dailyUsers).map(([date, count]) => ({ date, count })),
    monthlyEnrollments:  Object.entries(monthlyEnrollments).map(([month, count]) => ({ month, count })),
    topCourses:          topCoursesWithTitles,
    revenueBreakdown: {
      courses:  totalCourseRevenue,
      products: totalProductRevenue,
      total:    totalCourseRevenue + totalProductRevenue,
    },
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10) // "YYYY-MM-DD"
}

function toMonthKey(d: Date): string {
  return d.toISOString().slice(0, 7) // "YYYY-MM"
}

function buildDailyBuckets(from: Date, to: Date): Record<string, number> {
  const result: Record<string, number> = {}
  const cursor = new Date(from)
  cursor.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(23, 59, 59, 999)

  while (cursor <= end) {
    result[toDateKey(cursor)] = 0
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

function buildMonthlyBuckets(from: Date, to: Date): Record<string, number> {
  const result: Record<string, number> = {}
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1)
  const endMonth = new Date(to.getFullYear(), to.getMonth(), 1)

  while (cursor <= endMonth) {
    result[toMonthKey(cursor)] = 0
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return result
}
