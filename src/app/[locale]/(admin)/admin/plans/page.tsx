/**
 * Admin membership plans list — /[locale]/admin/plans
 */
import { Link }   from '@/i18n/navigation'
import { db }     from '@/lib/db'
import type { Locale } from '@/i18n/routing'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'Membership Plans — ALMANAR Admin' }
}

export default async function AdminPlansPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const isAr = locale === 'ar'

  const plans = await db.membershipPlan.findMany({
    orderBy: { monthlyPrice: 'asc' },
    select: {
      id:           true,
      nameEn:       true,
      nameAr:       true,
      monthlyPrice: true,
      annualPrice:  true,
      isActive:     true,
      _count: { select: { subscriptions: true } },
    },
  }).catch(() => [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isAr ? 'خطط العضوية' : 'Membership Plans'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {plans.length} {isAr ? 'خطة' : 'plans'}
          </p>
        </div>
        <Link
          href={`/admin/plans/new`}
          className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold"
        >
          {isAr ? '+ خطة جديدة' : '+ New Plan'}
        </Link>
      </div>

      {/* Table */}
      {plans.length === 0 ? (
        <div className="card-brand p-12 text-center text-muted-foreground text-sm">
          {isAr ? 'لا توجد خطط عضوية بعد' : 'No membership plans yet'}
        </div>
      ) : (
        <div className="card-brand overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-3 text-start">{isAr ? 'الاسم' : 'Name'}</th>
                <th className="px-4 py-3 text-start hidden sm:table-cell">{isAr ? 'الشهري' : 'Monthly'}</th>
                <th className="px-4 py-3 text-start hidden md:table-cell">{isAr ? 'السنوي' : 'Annual'}</th>
                <th className="px-4 py-3 text-start hidden md:table-cell">{isAr ? 'مشتركون' : 'Members'}</th>
                <th className="px-4 py-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="px-4 py-3 text-start">{isAr ? 'إجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{isAr ? p.nameAr : p.nameEn}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell font-medium">
                    ${Number(p.monthlyPrice).toFixed(2)}/mo
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-medium">
                    ${Number(p.annualPrice).toFixed(2)}/yr
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {p._count.subscriptions}
                  </td>
                  <td className="px-4 py-3">
                    <span className={[
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      p.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground',
                    ].join(' ')}>
                      {p.isActive ? (isAr ? 'نشط' : 'Active') : (isAr ? 'غير نشط' : 'Inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/plans/${p.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      {isAr ? 'تحرير' : 'Edit'}
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
