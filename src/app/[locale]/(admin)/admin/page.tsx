/**
 * Admin Overview — Kajabi-style dashboard
 * KPI cards + 7-day revenue chart + quick actions + recent activity
 */
import { db }          from '@/lib/db'
import { Link }        from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ locale: Locale }> }

export async function generateMetadata() {
  return { title: 'Admin Overview — ALMANAR' }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

function timeAgo(d: Date) {
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon, iconBg,
}: {
  label: string; value: string; sub: string
  icon: React.ReactNode; iconBg: string
}) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 flex items-start gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-stone-900 leading-none">{value}</p>
        <p className="mt-1 text-sm font-medium text-stone-700">{label}</p>
        <p className="mt-0.5 text-xs text-stone-400">{sub}</p>
      </div>
    </div>
  )
}

// ── Mini SVG Bar Chart ────────────────────────────────────────────────────────
// Pure SVG, zero dependencies. Takes up to 7 day buckets.

function RevenueChart({ days }: { days: { label: string; amount: number }[] }) {
  const max = Math.max(...days.map(d => d.amount), 1)
  const W = 480, H = 120, BAR_W = 40, GAP = 12
  const totalBarWidth = days.length * BAR_W + (days.length - 1) * GAP
  const startX = (W - totalBarWidth) / 2

  return (
    <svg
      viewBox={`0 0 ${W} ${H + 32}`}
      className="w-full"
      aria-label="7-day revenue chart"
      role="img"
    >
      {days.map((day, i) => {
        const barH = max > 0 ? Math.max(4, (day.amount / max) * H) : 4
        const x = startX + i * (BAR_W + GAP)
        const y = H - barH
        return (
          <g key={day.label}>
            {/* Background track */}
            <rect x={x} y={0} width={BAR_W} height={H} rx={6} fill="#F5F5F4" />
            {/* Value bar — gold */}
            <rect x={x} y={y} width={BAR_W} height={barH} rx={6} fill="#CA8A04" opacity="0.9" />
            {/* Day label */}
            <text
              x={x + BAR_W / 2} y={H + 20}
              textAnchor="middle"
              fontSize="10"
              fill="#A8A29E"
              fontFamily="system-ui"
            >
              {day.label}
            </text>
            {/* Amount on top */}
            {day.amount > 0 && (
              <text
                x={x + BAR_W / 2} y={y - 6}
                textAnchor="middle"
                fontSize="9"
                fill="#78716C"
                fontFamily="system-ui"
              >
                ${day.amount.toFixed(0)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminOverviewPage({ params }: Props) {
  await params

  // ── Day buckets for 7-day chart ──────────────────────────────────────────
  const dayBuckets = Array.from({ length: 7 }, (_, i) => {
    const start = new Date()
    start.setDate(start.getDate() - (6 - i))
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setHours(23, 59, 59, 999)
    return { start, end, label: start.toLocaleDateString('en-US', { weekday: 'short' }) }
  })

  // ── All DB queries in parallel ───────────────────────────────────────────
  const [
    totalStudents,
    totalEnrollments,
    activeSubscriptions,
    totalCourses,
    publishedCourses,
    totalProducts,
    courseRev30,
    productRev30,
    ...dayRevResults
  ] = await Promise.all([
    db.user.count({ where: { role: 'STUDENT' } }),
    db.enrollment.count(),
    db.subscription.count({ where: { status: 'ACTIVE' } }),
    db.course.count(),
    db.course.count({ where: { isPublished: true } }),
    db.product.count({ where: { isPublished: true } }),
    // 30-day revenue
    db.coursePurchase.aggregate({
      where: { status: 'COMPLETED', createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      _sum: { amount: true },
    }),
    db.productPurchase.aggregate({
      where: { status: 'COMPLETED', isFree: false, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      _sum: { amount: true },
    }),
    // 7-day chart buckets
    ...dayBuckets.map(({ start, end }) =>
      db.coursePurchase.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }).then(r => Number(r._sum.amount ?? 0))
    ),
  ]).catch(() => [0, 0, 0, 0, 0, 0, { _sum: { amount: null } }, { _sum: { amount: null } }, 0, 0, 0, 0, 0, 0, 0] as const)

  const revenue30 = Number((courseRev30 as any)?._sum?.amount ?? 0) + Number((productRev30 as any)?._sum?.amount ?? 0)

  const chartData = dayBuckets.map((b, i) => ({
    label:  b.label,
    amount: typeof dayRevResults[i] === 'number' ? dayRevResults[i] as number : 0,
  }))

  // ── Recent activity ──────────────────────────────────────────────────────
  const recentEnrollments = await db.enrollment.findMany({
    take:    8,
    orderBy: { createdAt: 'desc' },
    select: {
      id:        true,
      createdAt: true,
      user:      { select: { name: true, email: true } },
      course:    { select: { titleEn: true, slug: true } },
    },
  }).catch(() => [])

  return (
    <div className="space-y-6">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Dashboard</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/courses/new"
            className="flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Course
          </Link>
        </div>
      </div>

      {/* ── KPI Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Revenue"
          value={formatCurrency(revenue30)}
          sub="Last 30 days"
          iconBg="bg-amber-50"
          icon={
            <svg className="h-5 w-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Students"
          value={totalStudents.toLocaleString()}
          sub="Total registered"
          iconBg="bg-blue-50"
          icon={
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Enrollments"
          value={totalEnrollments.toLocaleString()}
          sub="All time"
          iconBg="bg-emerald-50"
          icon={
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          }
        />
        <KpiCard
          label="Active Members"
          value={activeSubscriptions.toLocaleString()}
          sub="Live subscriptions"
          iconBg="bg-violet-50"
          icon={
            <svg className="h-5 w-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          }
        />
      </div>

      {/* ── Middle row: chart + quick actions + content stats ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-stone-800">Revenue</h2>
              <p className="text-xs text-stone-400 mt-0.5">Last 7 days (courses)</p>
            </div>
            <span className="text-xl font-bold text-stone-900">{formatCurrency(chartData.reduce((s, d) => s + d.amount, 0))}</span>
          </div>
          <RevenueChart days={chartData} />
        </div>

        {/* Right column: quick actions + content stats */}
        <div className="space-y-4">

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-stone-800">Quick Create</h2>
            <div className="space-y-2">
              {[
                { href: '/admin/courses/new',  label: 'New Course'  },
                { href: '/admin/products/new', label: 'New Product' },
                { href: '/admin/bundles/new',  label: 'New Bundle'  },
                { href: '/admin/coupons/new',  label: 'New Coupon'  },
                { href: '/admin/plans/new',    label: 'New Plan'    },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href as any}
                  className="flex items-center gap-2.5 rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-700 hover:border-gold/40 hover:text-stone-900 hover:bg-amber-50/50 transition-all duration-150 cursor-pointer"
                >
                  <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Content stats */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-stone-800">Content</h2>
            <div className="space-y-2">
              {[
                { label: 'Courses',  value: `${publishedCourses} / ${totalCourses}`, note: 'published' },
                { label: 'Products', value: String(totalProducts),                   note: 'published' },
              ].map(({ label, value, note }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
                  <span className="text-sm text-stone-600">{label}</span>
                  <div className="text-end">
                    <span className="text-sm font-semibold text-stone-900">{value}</span>
                    <span className="text-xs text-stone-400 ms-1.5">{note}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Enrollments ────────────────────────────────────────── */}
      {recentEnrollments.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-800">Recent Enrollments</h2>
            <Link
              href="/admin/users"
              className="text-xs font-medium text-stone-500 hover:text-gold transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-stone-100">
            {recentEnrollments.map((e) => (
              <div key={e.id} className="flex items-center gap-4 px-5 py-3">
                {/* Avatar */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600">
                  {(e.user?.name ?? e.user?.email ?? '?').charAt(0).toUpperCase()}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">
                    {e.user?.name ?? e.user?.email ?? 'Unknown user'}
                  </p>
                  <p className="text-xs text-stone-400 truncate">
                    enrolled in <span className="text-stone-600">{e.course?.titleEn ?? 'a course'}</span>
                  </p>
                </div>
                {/* Time */}
                <span className="text-xs text-stone-400 shrink-0">{timeAgo(new Date(e.createdAt))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no enrollments */}
      {recentEnrollments.length === 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100">
              <svg className="h-6 w-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-medium text-stone-700">No enrollments yet</p>
          <p className="text-xs text-stone-400 mt-1">Enrollments will appear here once students sign up for courses.</p>
          <Link
            href="/admin/courses/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 transition-colors"
          >
            Create your first course
          </Link>
        </div>
      )}

    </div>
  )
}
