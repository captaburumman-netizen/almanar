/**
 * Admin bundles list — /[locale]/admin/bundles
 */
import { Link }   from '@/i18n/navigation'
import { db }     from '@/lib/db'
import { PublishToggle } from '@/components/admin/PublishToggle'
import type { Locale }   from '@/i18n/routing'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'Bundles — ALMANAR Admin' }
}

export default async function AdminBundlesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const isAr = locale === 'ar'

  const bundles = await db.bundle.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id:          true,
      slug:        true,
      titleEn:     true,
      titleAr:     true,
      price:       true,
      isPublished: true,
      _count:      { select: { items: true } },
    },
  }).catch(() => [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isAr ? 'الباقات' : 'Bundles'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {bundles.length} {isAr ? 'باقة' : 'bundles'}
          </p>
        </div>
        <Link
          href={`/${locale}/admin/bundles/new` as `/${string}/admin/bundles/new`}
          className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold"
        >
          {isAr ? '+ باقة جديدة' : '+ New Bundle'}
        </Link>
      </div>

      {/* Table */}
      {bundles.length === 0 ? (
        <div className="card-brand p-12 text-center text-muted-foreground text-sm">
          {isAr ? 'لا توجد باقات بعد' : 'No bundles yet'}
        </div>
      ) : (
        <div className="card-brand overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-3 text-start">{isAr ? 'العنوان' : 'Title'}</th>
                <th className="px-4 py-3 text-start hidden sm:table-cell">{isAr ? 'المنتجات' : 'Products'}</th>
                <th className="px-4 py-3 text-start hidden md:table-cell">{isAr ? 'السعر' : 'Price'}</th>
                <th className="px-4 py-3 text-start">{isAr ? 'النشر' : 'Published'}</th>
                <th className="px-4 py-3 text-start">{isAr ? 'إجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bundles.map((b) => (
                <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground truncate max-w-[200px]">
                      {isAr ? b.titleAr : b.titleEn}
                    </p>
                    <p className="text-xs text-muted-foreground">{b.slug}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {b._count.items}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-medium">
                    ${Number(b.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <PublishToggle
                      id={b.id}
                      published={b.isPublished}
                      endpoint={`/api/admin/bundles/${b.id}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/${locale}/admin/bundles/${b.id}` as `/${string}/admin/bundles/${string}`}
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
