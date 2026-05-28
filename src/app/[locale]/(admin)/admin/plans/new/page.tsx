/**
 * Admin create plan — /[locale]/admin/plans/new
 */
import { Link }        from '@/i18n/navigation'
import { PlanForm }    from '@/components/admin/PlanForm'
import type { Locale } from '@/i18n/routing'

export async function generateMetadata() {
  return { title: 'New Plan — ALMANAR Admin' }
}

export default async function NewPlanPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const isAr = locale === 'ar'

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/${locale}/admin/plans` as `/${string}/admin/plans`} className="hover:text-foreground">
          {isAr ? 'خطط العضوية' : 'Plans'}
        </Link>
        <span>/</span>
        <span className="text-foreground">{isAr ? 'خطة جديدة' : 'New Plan'}</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">
        {isAr ? 'إنشاء خطة عضوية' : 'Create Membership Plan'}
      </h1>

      <PlanForm locale={locale} />
    </div>
  )
}
