/**
 * Admin create bundle — /[locale]/admin/bundles/new
 */
import { Link }        from '@/i18n/navigation'
import { BundleForm }  from '@/components/admin/BundleForm'
import type { Locale } from '@/i18n/routing'

export async function generateMetadata() {
  return { title: 'New Bundle — ALMANAR Admin' }
}

export default async function NewBundlePage({
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
        <Link href={`/admin/bundles`} className="hover:text-foreground">
          {isAr ? 'الباقات' : 'Bundles'}
        </Link>
        <span>/</span>
        <span className="text-foreground">{isAr ? 'باقة جديدة' : 'New Bundle'}</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">
        {isAr ? 'إنشاء باقة جديدة' : 'Create New Bundle'}
      </h1>

      <BundleForm locale={locale} />
    </div>
  )
}
