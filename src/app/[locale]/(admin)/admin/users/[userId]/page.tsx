/**
 * Admin user detail — /[locale]/admin/users/[userId]
 *
 * Shows:
 *   - Profile info + role toggle
 *   - Active subscription
 *   - Course enrollments (with add / remove)
 *   - Purchase history
 */
import { notFound }         from 'next/navigation'
import { db }               from '@/lib/db'
import { Link }             from '@/i18n/navigation'
import { RoleToggle }       from '@/components/admin/RoleToggle'
import { EnrollmentManager } from '@/components/admin/EnrollmentManager'
import type { Locale }      from '@/i18n/routing'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ locale: Locale; userId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { userId } = await params
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
  return { title: `${user?.name ?? user?.email ?? 'User'} — ALMANAR Admin` }
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { userId } = await params

  const [user, allCourses] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id:              true,
        name:            true,
        email:           true,
        role:            true,
        createdAt:       true,
        preferredLocale: true,
        stripeCustomerId:true,
        subscription: {
          select: {
            status: true, interval: true,
            currentPeriodEnd: true, cancelAtPeriodEnd: true,
            plan: { select: { nameEn: true } },
          },
        },
        enrollments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, accessType: true, createdAt: true,
            course: { select: { id: true, titleEn: true, titleAr: true, slug: true } },
          },
        },
        coursePurchases: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, amount: true, currency: true, status: true, createdAt: true,
            course: { select: { titleEn: true } },
          },
        },
        productPurchases: {
          orderBy: { createdAt: 'desc' },
          where: { status: 'COMPLETED' },
          select: {
            id: true, amount: true, isFree: true, createdAt: true,
            product: { select: { titleEn: true } },
          },
        },
      },
    }),
    db.course.findMany({
      where:   { isPublished: true },
      orderBy: { titleEn: 'asc' },
      select:  { id: true, titleEn: true, titleAr: true },
    }),
  ])

  if (!user) notFound()

  const totalSpend = [
    ...user.coursePurchases.filter((p) => p.status === 'COMPLETED').map((p) => Number(p.amount)),
    ...user.productPurchases.map((p) => Number(p.amount)),
  ].reduce((s, n) => s + n, 0)

  const accessBadge: Record<string, string> = {
    PURCHASE:   'bg-blue-100 text-blue-700',
    MEMBERSHIP: 'bg-purple-100 text-purple-700',
    FREE:       'bg-green-100 text-green-700',
    ADMIN:      'bg-orange-100 text-orange-700',
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/users" className="hover:text-foreground">Users</Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[240px]">{user.name ?? user.email}</span>
      </div>

      {/* Profile card */}
      <div className="card-brand p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-foreground">{user.name ?? '(No name)'}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              <span>Joined {user.createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span>Locale: {user.preferredLocale.toUpperCase()}</span>
              {user.stripeCustomerId && (
                <span className="font-mono">{user.stripeCustomerId}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={[
              'rounded-full px-3 py-1 text-xs font-semibold',
              user.role === 'ADMIN'
                ? 'bg-warm-brown/10 text-warm-brown'
                : 'bg-muted text-muted-foreground',
            ].join(' ')}>
              {user.role}
            </span>
            <RoleToggle userId={userId} currentRole={user.role} />
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4">
          {[
            { label: 'Enrollments', value: user.enrollments.length },
            { label: 'Purchases',   value: user.coursePurchases.length + user.productPurchases.length },
            { label: 'Total Spent', value: `$${totalSpend.toFixed(2)}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-lg font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Subscription */}
      {user.subscription && (
        <section className="card-brand p-5 space-y-3">
          <h2 className="text-base font-semibold text-foreground">Subscription</h2>
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <span className="font-medium">{user.subscription.plan.nameEn}</span>
            <span className="text-muted-foreground capitalize">{user.subscription.interval.toLowerCase()}</span>
            <span className={[
              'rounded-full px-2 py-0.5 text-xs font-medium',
              user.subscription.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground',
            ].join(' ')}>
              {user.subscription.status}
            </span>
          </div>
          {user.subscription.currentPeriodEnd && (
            <p className="text-xs text-muted-foreground">
              {user.subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
              {user.subscription.currentPeriodEnd.toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </p>
          )}
        </section>
      )}

      {/* Enrollments */}
      <section className="card-brand p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">
          Course Enrollments ({user.enrollments.length})
        </h2>

        {user.enrollments.length > 0 && (
          <div className="space-y-2">
            {user.enrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 text-sm">
                <div>
                  <p className="font-medium text-foreground">{e.course.titleEn}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${accessBadge[e.accessType] ?? 'bg-muted text-muted-foreground'}`}>
                  {e.accessType}
                </span>
              </div>
            ))}
          </div>
        )}

        <EnrollmentManager
          userId={userId}
          enrolledCourseIds={user.enrollments.map((e) => e.course.id)}
          allCourses={allCourses}
        />
      </section>

      {/* Purchase history */}
      {(user.coursePurchases.length > 0 || user.productPurchases.length > 0) && (
        <section className="card-brand p-5 space-y-3">
          <h2 className="text-base font-semibold text-foreground">Purchase History</h2>
          <div className="space-y-2">
            {user.coursePurchases.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 text-sm">
                <div>
                  <p className="font-medium text-foreground">{p.course.titleEn}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' · '}Course
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${Number(p.amount).toFixed(2)}</p>
                  <span className={`text-xs ${p.status === 'COMPLETED' ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
            {user.productPurchases.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 text-sm">
                <div>
                  <p className="font-medium text-foreground">{p.product?.titleEn ?? 'Product'}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' · '}Product
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{p.isFree ? 'Free' : `$${Number(p.amount).toFixed(2)}`}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
