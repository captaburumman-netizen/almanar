/**
 * Admin products list — /[locale]/admin/products
 */
import { db }            from '@/lib/db'
import { Link }          from '@/i18n/navigation'
import { PublishToggle } from '@/components/admin/PublishToggle'
import type { Locale }   from '@/i18n/routing'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'Products — ALMANAR Admin' }
}

export default async function AdminProductsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  await params

  const products = await db.product.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    select: {
      id:          true,
      slug:        true,
      titleEn:     true,
      titleAr:     true,
      price:       true,
      isFree:      true,
      category:    true,
      language:    true,
      isPublished: true,
    },
  })

  const categoryLabel: Record<string, string> = {
    EBOOK:                'eBook',
    PRINTABLE:            'Printable',
    MONTESSORI_MATERIAL:  'Montessori',
    TOY_AFFILIATE:        'Affiliate',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length} product{products.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/admin/products/new" className="btn-primary text-sm px-4 py-2 rounded-md">
          + New Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="card-brand p-12 text-center">
          <p className="text-muted-foreground">No products yet.</p>
          <Link href="/admin/products/new" className="mt-4 inline-block text-sm text-primary hover:underline">
            Create your first product →
          </Link>
        </div>
      ) : (
        <div className="card-brand overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{p.titleEn}</p>
                      <p className="text-xs text-muted-foreground">{p.titleAr}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {categoryLabel[p.category] ?? p.category}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.isFree ? 'Free' : `$${Number(p.price).toFixed(2)}`}
                  </td>
                  <td className="px-4 py-3">
                    <PublishToggle
                      id={p.id}
                      published={p.isPublished}
                      endpoint={`/api/admin/products/${p.id}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${p.id}` as `/admin/products/${string}`}
                      className="text-primary text-xs hover:underline"
                    >
                      Edit →
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
