/**
 * Edit product — /[locale]/admin/products/[productId]
 */
import { notFound }      from 'next/navigation'
import { db }            from '@/lib/db'
import { Link }          from '@/i18n/navigation'
import { ProductForm }   from '@/components/admin/ProductForm'
import { PublishToggle } from '@/components/admin/PublishToggle'
import type { Locale }   from '@/i18n/routing'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ locale: Locale; productId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { productId } = await params
  const p = await db.product.findUnique({ where: { id: productId }, select: { titleEn: true } })
  return { title: `${p?.titleEn ?? 'Product'} — ALMANAR Admin` }
}

export default async function EditProductPage({ params }: Props) {
  const { locale, productId } = await params

  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product) notFound()

  const initial = {
    titleEn:       product.titleEn,
    titleAr:       product.titleAr,
    descriptionEn: product.descriptionEn,
    descriptionAr: product.descriptionAr,
    price:         String(product.price),
    category:      product.category,
    language:      product.language,
    coverImage:    product.coverImage  ?? '',
    s3Key:         product.s3Key       ?? '',
    affiliateUrl:  product.affiliateUrl ?? '',
    sortOrder:     String(product.sortOrder),
    slug:          product.slug,
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/products" className="hover:text-foreground">Products</Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[240px]">{product.titleEn}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{product.titleEn}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{product.titleAr}</p>
        </div>
        <PublishToggle
          id={productId}
          published={product.isPublished}
          endpoint={`/api/admin/products/${productId}`}
        />
      </div>

      <ProductForm locale={locale} productId={productId} initial={initial} />

      {/* Danger zone */}
      <section className="card-brand p-5 border-destructive/30 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Danger Zone</h2>
        <p className="text-xs text-muted-foreground">
          Deleting a product will remove all associated purchase records and download tokens.
        </p>
        <DeleteProductButton productId={productId} locale={locale} />
      </section>
    </div>
  )
}

import { DeleteProductButton } from '@/components/admin/DeleteProductButton'
