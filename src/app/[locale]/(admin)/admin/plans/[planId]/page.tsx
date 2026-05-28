/**
 * Admin plan edit — /[locale]/admin/plans/[planId]
 */
import { notFound }     from 'next/navigation'
import { Link }         from '@/i18n/navigation'
import { db }           from '@/lib/db'
import { PlanForm }     from '@/components/admin/PlanForm'
import type { Locale }  from '@/i18n/routing'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ locale: Locale; planId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { planId } = await params
  const plan = await db.membershipPlan.findUnique({ where: { id: planId }, select: { nameEn: true } })
  return { title: `${plan?.nameEn ?? 'Plan'} — ALMANAR Admin` }
}

export default async function AdminPlanDetailPage({ params }: Props) {
  const { locale, planId } = await params
  const isAr = locale === 'ar'

  const plan = await db.membershipPlan.findUnique({
    where: { id: planId },
    select: {
      id:                   true,
      nameEn:               true,
      nameAr:               true,
      descriptionEn:        true,
      descriptionAr:        true,
      featuresEn:           true,
      featuresAr:           true,
      monthlyPrice:         true,
      annualPrice:          true,
      stripePriceIdMonthly: true,
      stripePriceIdAnnual:  true,
      isActive:             true,
      _count: { select: { subscriptions: true } },
    },
  })

  if (!plan) notFound()

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/admin/plans`} className="hover:text-foreground">
          {isAr ? 'خطط العضوية' : 'Plans'}
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[200px]">
          {isAr ? plan.nameAr : plan.nameEn}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">{isAr ? plan.nameAr : plan.nameEn}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {plan._count.subscriptions}{' '}
            {isAr ? 'مشترك نشط' : 'active subscribers'}
          </p>
        </div>
        <span className={[
          'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
          plan.isActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground',
        ].join(' ')}>
          {plan.isActive ? (isAr ? 'نشط' : 'Active') : (isAr ? 'غير نشط' : 'Inactive')}
        </span>
      </div>

      {/* Edit form */}
      <PlanForm
        plan={{
          ...plan,
          descriptionEn: plan.descriptionEn ?? '',
          descriptionAr: plan.descriptionAr ?? '',
          monthlyPrice:  plan.monthlyPrice.toString(),
          annualPrice:   plan.annualPrice.toString(),
        }}
        locale={locale}
      />
    </div>
  )
}
