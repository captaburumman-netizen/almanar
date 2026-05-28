/**
 * Admin bundle edit — /[locale]/admin/bundles/[bundleId]
 *
 * Shows:
 *   - Bundle edit form
 *   - Bundle item manager (add/remove products)
 *   - Delete action
 */
import { notFound }              from 'next/navigation'
import { Link }                  from '@/i18n/navigation'
import { db }                    from '@/lib/db'
import { BundleForm }            from '@/components/admin/BundleForm'
import { BundleItemManager }     from '@/components/admin/BundleItemManager'
import { PublishToggle }         from '@/components/admin/PublishToggle'
import { DeleteBundleButton }    from '@/components/admin/DeleteBundleButton'
import type { Locale }           from '@/i18n/routing'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ locale: Locale; bundleId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { bundleId } = await params
  const bundle = await db.bundle.findUnique({ where: { id: bundleId }, select: { titleEn: true } })
  return { title: `${bundle?.titleEn ?? 'Bundle'} — ALMANAR Admin` }
}

export default async function AdminBundleDetailPage({ params }: Props) {
  const { locale, bundleId } = await params
  const isAr = locale === 'ar'

  const [bundle, allProducts] = await Promise.all([
    db.bundle.findUnique({
      where: { id: bundleId },
      include: {
        items: {
          select: {
            id:      true,
            product: { select: { id: true, titleEn: true, titleAr: true, coverImage: true, price: true } },
          },
        },
      },
    }),
    db.product.findMany({
      where:   { isPublished: true },
      orderBy: { titleEn: 'asc' },
      select:  { id: true, titleEn: true, titleAr: true },
    }),
  ])

  if (!bundle) notFound()

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/${locale}/admin/bundles` as `/${string}/admin/bundles`} className="hover:text-foreground">
          {isAr ? 'الباقات' : 'Bundles'}
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[200px]">
          {isAr ? bundle.titleAr : bundle.titleEn}
        </span>
      </nav>

      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">
          {isAr ? bundle.titleAr : bundle.titleEn}
        </h1>
        <PublishToggle
          id={bundle.id}
          published={bundle.isPublished}
          endpoint={`/api/admin/bundles/${bundle.id}`}
        />
      </div>

      {/* Edit form */}
      <BundleForm
        bundle={{
          id:            bundle.id,
          titleEn:       bundle.titleEn,
          titleAr:       bundle.titleAr,
          descriptionEn: bundle.descriptionEn,
          descriptionAr: bundle.descriptionAr,
          price:         bundle.price.toString(),
          coverImage:    bundle.coverImage,
          isPublished:   bundle.isPublished,
        }}
        locale={locale}
      />

      {/* Bundle items */}
      <section className="card-brand p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          {isAr ? 'المنتجات في الباقة' : 'Products in Bundle'}
        </h2>
        <BundleItemManager
          bundleId={bundle.id}
          currentItems={bundle.items}
          allProducts={allProducts}
          locale={locale}
        />
      </section>

      {/* Danger zone */}
      <section className="card-brand p-5 border-destructive/30 space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          {isAr ? 'منطقة الخطر' : 'Danger Zone'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isAr ? 'حذف الباقة نهائيًا — لا يمكن التراجع عن هذا الإجراء.' : 'Permanently delete this bundle — this action cannot be undone.'}
        </p>
        <DeleteBundleButton
          bundleId={bundle.id}
          redirectPath={`/${locale}/admin/bundles`}
        />
      </section>
    </div>
  )
}
