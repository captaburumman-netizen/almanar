/**
 * New product — /[locale]/admin/products/new
 */
import { ProductForm } from '@/components/admin/ProductForm'
import { Link }        from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

export async function generateMetadata() {
  return { title: 'New Product — ALMANAR Admin' }
}

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/products" className="hover:text-foreground">Products</Link>
        <span>/</span>
        <span className="text-foreground">New Product</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground">Create Product</h1>
      <ProductForm locale={locale} />
    </div>
  )
}
