/**
 * Admin analytics — /[locale]/admin/analytics
 *
 * Fully server-rendered. Shows:
 *   - Revenue summary cards
 *   - Daily revenue bar chart (last 30 days)
 *   - Daily new users bar chart (last 30 days)
 *   - Monthly enrollments bar chart (last 6 months)
 *   - Top 10 courses by enrollment
 */
import { db }          from '@/lib/db'
import type { Locale } from '@/i18n/routing'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'Analytics — ALMANAR Admin' }
}

export default async function AdminAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  await params

  const now       = new Date()
  const day30ago  = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const day180ago = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

  // ── Fetch raw data ─────────────────────────────────────────────────────────
  const [
    coursePurchases,
    productPurchases,
    newUsers,
    enrollments,
    topCoursesRaw,
    totalUsers,
    activeSubscriptions,
  ] = await Promise.all([
    db.coursePurchase.findMany({
      where:   { status: 'COMPLETED', createdAt: { gte: day30ago } },
      select:  { amount: true, createdAt: true },
    }),
    db.productPurchase.findMany({
      where:   { status: 'COMPLETED', isFree: false, createdAt: { gte: day30ago } },
      select:  { amount: true, createdAt: true },
    }),
    db.user.findMany({
      where:   { createdAt: { gte: day30ago } },
      select:  { createdAt: true },
    }),
    db.enrollment.findMany({
      where:   { createdAt: { gte: day180ago } },
      select:  { createdAt: true },
    }),
    db.enrollment.groupBy({
      by:      ['courseId'],
      _count:  { courseId: true },
      orderBy: { _count: { courseId: 'desc' } },
      take:    10,
    }),
    db.user.count(),
    db.subscription.count({ where: { status: 'ACTIVE' } }),
  ])

  // ── Build time-series buckets ──────────────────────────────────────────────
  const dailyRevenue = buildDailyBuckets(day30ago, now)
  const dailyUsers   = buildDailyBuckets(day30ago, now)
  const monthlyEnrollments = buildMonthlyBuckets(day180ago, now)

  for (const p of [...coursePurchases, ...productPurchases]) {
    const k = toDateKey(p.createdAt)
    if (k in dailyRevenue) dailyRevenue[k]! += Number(p.amount)
  }
  for (const u of newUsers) {
    const k = toDateKey(u.createdAt)
    if (k in dailyUsers) dailyUsers[k]!++
  }
  for (const e of enrollments) {
    const k = toMonthKey(e.createdAt)
    if (k in monthlyEnrollments) monthlyEnrollments[k]!++
  }

  // ── Top courses ────────────────────────────────────────────────────────────
  const courseIds     = topCoursesRaw.map((c) => c.courseId)
  const courseDetails = await db.course.findMany({
    where:  { id: { in: courseIds } },
    select: { id: true, titleEn: true },
  })
  const courseMap = Object.fromEntries(courseDetails.map((c) => [c.id, c]))
  const topCourses = topCoursesRaw.map((c) => ({
    titleEn:     courseMap[c.courseId]?.titleEn ?? 'Unknown',
    enrollments: c._count.courseId,
  }))

  // ── Revenue summary ────────────────────────────────────────────────────────
  const totalRevenue30d = Object.values(dailyRevenue).reduce((s, v) => s + v, 0)
  const totalCourseRev  = coursePurchases.reduce((s, p) => s + Number(p.amount), 0)
  const totalProductRev = productPurchases.reduce((s, p) => s + Number(p.amount), 0)
  const newUsers30d     = Object.values(dailyUsers).reduce((s, v) => s + v, 0)
  const newEnrollments  = Object.values(monthlyEnrollments)
    .slice(-1)[0] ?? 0

  const summaryCards = [
    { label: '30-day Revenue',      value: `$${totalRevenue30d.toFixed(2)}` },
    { label: 'Course Revenue',      value: `$${totalCourseRev.toFixed(2)}` },
    { label: 'Product Revenue',     value: `$${totalProductRev.toFixed(2)}` },
    { label: 'New Users (30d)',      value: String(newUsers30d) },
    { label: 'Total Users',          value: String(totalUsers) },
    { label: 'Active Subscriptions', value: String(activeSubscriptions) },
    { label: 'Enrollments (this mo.)',value: String(newEnrollments) },
  ]

  const revEntries  = Object.entries(dailyRevenue)
  const userEntries = Object.entries(dailyUsers)
  const moEntries   = Object.entries(monthlyEnrollments)

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last 30 days · Updated now</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value }) => (
          <div key={label} className="card-brand p-4 space-y-1">
            <p className="text-xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Daily revenue chart */}
      <section className="card-brand p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Daily Revenue (last 30 days)</h2>
        <BarChart
          entries={revEntries}
          formatValue={(v) => `$${v.toFixed(0)}`}
          formatLabel={(k) => k.slice(5)} // "MM-DD"
          color="var(--color-primary, #C4622D)"
          height={120}
        />
      </section>

      {/* Daily new users chart */}
      <section className="card-brand p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">New Users per Day (last 30 days)</h2>
        <BarChart
          entries={userEntries}
          formatValue={(v) => String(v)}
          formatLabel={(k) => k.slice(5)}
          color="#3B82F6"
          height={100}
        />
      </section>

      {/* Monthly enrollments chart */}
      <section className="card-brand p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Monthly Enrollments (last 6 months)</h2>
        <BarChart
          entries={moEntries}
          formatValue={(v) => String(v)}
          formatLabel={(k) => k.slice(5)} // "MM"
          color="#8B5CF6"
          height={100}
        />
      </section>

      {/* Top courses */}
      <section className="card-brand p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Top Courses by Enrollment</h2>
        {topCourses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No enrollments yet.</p>
        ) : (
          <div className="space-y-2">
            {topCourses.map((c, i) => {
              const maxEnroll = topCourses[0]?.enrollments ?? 1
              const pct = Math.round((c.enrollments / maxEnroll) * 100)
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground truncate max-w-[300px]">{c.titleEn}</span>
                    <span className="text-muted-foreground shrink-0 ms-3">{c.enrollments}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: '#C4622D' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

// ─── CSS Bar Chart ─────────────────────────────────────────────────────────────

function BarChart({
  entries,
  formatValue,
  formatLabel,
  color,
  height,
}: {
  entries:      [string, number][]
  formatValue:  (_v: number) => string
  formatLabel:  (_k: string) => string
  color:        string
  height:       number
}) {
  const max = Math.max(...entries.map(([, v]) => v), 1)
  // Show every 5th label to avoid clutter on daily charts
  const labelStep = entries.length > 14 ? Math.ceil(entries.length / 10) : 1

  if (max === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">No data for this period.</p>
    )
  }

  return (
    <div>
      <div
        className="flex items-end gap-px w-full overflow-hidden"
        style={{ height }}
        aria-hidden="true"
      >
        {entries.map(([key, value]) => {
          const barH = value === 0 ? 1 : Math.max(2, Math.round((value / max) * height))
          return (
            <div
              key={key}
              title={`${formatLabel(key)}: ${formatValue(value)}`}
              className="flex-1 rounded-t-sm hover:opacity-80 transition-opacity"
              style={{ height: barH, backgroundColor: color, minWidth: 2 }}
            />
          )
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex w-full mt-1 overflow-hidden" aria-hidden="true">
        {entries.map(([key], i) => (
          <div key={key} className="flex-1 text-center" style={{ minWidth: 2 }}>
            {i % labelStep === 0 && (
              <span className="text-[10px] text-muted-foreground leading-none">
                {formatLabel(key)}
              </span>
            )}
          </div>
        ))}
      </div>
      {/* Y-axis range */}
      <p className="text-xs text-muted-foreground mt-1">
        Max: {formatValue(max)}
      </p>
    </div>
  )
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateKey(d: Date): string  { return d.toISOString().slice(0, 10) }
function toMonthKey(d: Date): string { return d.toISOString().slice(0, 7) }

function buildDailyBuckets(from: Date, to: Date): Record<string, number> {
  const r: Record<string, number> = {}
  const c = new Date(from); c.setHours(0, 0, 0, 0)
  const e = new Date(to);   e.setHours(23, 59, 59, 999)
  while (c <= e) { r[toDateKey(c)] = 0; c.setDate(c.getDate() + 1) }
  return r
}

function buildMonthlyBuckets(from: Date, to: Date): Record<string, number> {
  const r: Record<string, number> = {}
  const c = new Date(from.getFullYear(), from.getMonth(), 1)
  const e = new Date(to.getFullYear(),   to.getMonth(),   1)
  while (c <= e) { r[toMonthKey(c)] = 0; c.setMonth(c.getMonth() + 1) }
  return r
}
