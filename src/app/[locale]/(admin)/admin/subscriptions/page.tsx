/**
 * Admin subscriptions list — /[locale]/admin/subscriptions
 *
 * Paginated table of all member subscriptions with status filter.
 */
import { Link }        from '@/i18n/navigation'
import { db }          from '@/lib/db'
import { formatDate }  from '@/lib/utils'
import type { Locale } from '@/i18n/routing'
import type { SubscriptionStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'Subscriptions — ALMANAR Admin' }
}

const STATUS_LABELS: Record<SubscriptionStatus, { en: string; ar: string; color: string }> = {
  ACTIVE:     { en: 'Active',     ar: 'نشط',        color: 'bg-green-100 text-green-700'      },
  TRIALING:   { en: 'Trialing',   ar: 'تجريبي',     color: 'bg-blue-100 text-blue-700'        },
  CANCELED:   { en: 'Canceled',   ar: 'ملغى',        color: 'bg-muted text-muted-foreground'   },
  PAST_DUE:   { en: 'Past Due',   ar: 'متأخر',       color: 'bg-red-100 text-red-700'          },
  UNPAID:     { en: 'Unpaid',     ar: 'غير مدفوع',   color: 'bg-orange-100 text-orange-700'    },
  INCOMPLETE: { en: 'Incomplete', ar: 'غير مكتمل',   color: 'bg-yellow-100 text-yellow-700'    },
}

interface Props {
  params:      Promise<{ locale: Locale }>
  searchParams: Promise<{ status?: string; page?: string }>
}

export default async function AdminSubscriptionsPage({ params, searchParams }: Props) {
  const { locale }         = await params
  const { status, page: pageParam } = await searchParams
  const isAr   = locale === 'ar'
  const page   = Math.max(1, parseInt(pageParam ?? '1', 10))
  const PAGE_SIZE = 25

  const validStatuses = Object.keys(STATUS_LABELS) as SubscriptionStatus[]
  const statusFilter  = validStatuses.includes(status?.toUpperCase() as SubscriptionStatus)
    ? { status: status!.toUpperCase() as SubscriptionStatus }
    : {}

  const [subscriptions, total] = await Promise.all([
    db.subscription.findMany({
      where:   statusFilter,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
      select: {
        id:                true,
        status:            true,
        interval:          true,
        currentPeriodEnd:  true,
        cancelAtPeriodEnd: true,
        createdAt:         true,
        user: { select: { id: true, name: true, email: true } },
        plan: { select: { nameEn: true, nameAr: true } },
      },
    }).catch(() => []),
    db.subscription.count({ where: statusFilter }).catch(() => 0),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isAr ? 'الاشتراكات' : 'Subscriptions'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} {isAr ? 'مشترك' : 'total'}
          </p>
        </div>
        <Link
          href={`/admin/plans`}
          className="text-sm text-primary hover:underline"
        >
          {isAr ? 'إدارة الخطط ←' : 'Manage Plans →'}
        </Link>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={isAr ? 'تصفية الحالة' : 'Filter by status'}>
        <Link
          href={`/admin/subscriptions`}
          className={[
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            !status ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent',
          ].join(' ')}
        >
          {isAr ? 'الكل' : 'All'}
        </Link>
        {validStatuses.map((s) => (
          <Link
            key={s}
            href={`/admin/subscriptions?status=${s.toLowerCase()}`}
            className={[
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              status?.toUpperCase() === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent',
            ].join(' ')}
          >
            {isAr ? STATUS_LABELS[s].ar : STATUS_LABELS[s].en}
          </Link>
        ))}
      </div>

      {/* Table */}
      {subscriptions.length === 0 ? (
        <div className="card-brand p-12 text-center text-muted-foreground text-sm">
          {isAr ? 'لا توجد اشتراكات' : 'No subscriptions found'}
        </div>
      ) : (
        <>
          <div className="card-brand overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-4 py-3 text-start">{isAr ? 'المستخدم' : 'User'}</th>
                  <th className="px-4 py-3 text-start hidden sm:table-cell">{isAr ? 'الخطة' : 'Plan'}</th>
                  <th className="px-4 py-3 text-start hidden md:table-cell">{isAr ? 'الدورة' : 'Interval'}</th>
                  <th className="px-4 py-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-start hidden lg:table-cell">{isAr ? 'ينتهي' : 'Period End'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subscriptions.map((sub) => {
                  const label = STATUS_LABELS[sub.status]
                  return (
                    <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground truncate max-w-[180px]">
                          {sub.user.name ?? '—'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {sub.user.email}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        {isAr ? sub.plan.nameAr : sub.plan.nameEn}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {sub.interval === 'ANNUAL'
                          ? (isAr ? 'سنوي' : 'Annual')
                          : (isAr ? 'شهري' : 'Monthly')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${label.color}`}>
                          {isAr ? label.ar : label.en}
                          {sub.cancelAtPeriodEnd && (
                            <span className="ms-1 opacity-70">
                              {isAr ? '· ينتهي' : '· ends'}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                        {formatDate(sub.currentPeriodEnd, locale)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                {isAr
                  ? `الصفحة ${page} من ${totalPages}`
                  : `Page ${page} of ${totalPages}`}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/subscriptions?page=${page - 1}${status ? `&status=${status}` : ''}`}
                    className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                  >
                    {isAr ? 'السابق' : 'Previous'}
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/subscriptions?page=${page + 1}${status ? `&status=${status}` : ''}`}
                    className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                  >
                    {isAr ? 'التالي' : 'Next'}
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
