/**
 * BundleItemManager — add / remove products from a bundle.
 *
 * Shows a dropdown of products NOT already in the bundle,
 * and remove buttons for those that are.
 */
'use client'

import { useState }  from 'react'
import { useRouter } from 'next/navigation'

interface Product {
  id:      string
  titleEn: string
  titleAr: string
}

interface BundleItem {
  id:      string
  product: Product
}

interface BundleItemManagerProps {
  bundleId:     string
  currentItems: BundleItem[]
  allProducts:  Product[]
  locale:       string
}

export function BundleItemManager({
  bundleId,
  currentItems,
  allProducts,
  locale,
}: BundleItemManagerProps) {
  const router    = useRouter()
  const isAr      = locale === 'ar'
  const [selected, setSelected] = useState('')
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const inBundle = new Set(currentItems.map((i) => i.product.id))
  const available = allProducts.filter((p) => !inBundle.has(p.id))

  async function addItem() {
    if (!selected) return
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/admin/bundles/${bundleId}/items`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ productId: selected }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string }
      setError(json.error ?? 'Failed to add item')
    } else {
      setSelected('')
      router.refresh()
    }
    setBusy(false)
  }

  async function removeItem(productId: string, productTitle: string) {
    if (!confirm(`Remove "${productTitle}" from bundle?`)) return
    setBusy(true)
    await fetch(`/api/admin/bundles/${bundleId}/items`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ productId }),
    })
    router.refresh()
    setBusy(false)
  }

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {isAr ? 'منتجات الباقة' : 'Bundle Products'}
      </p>

      {/* Current items */}
      {currentItems.length > 0 ? (
        <ul className="space-y-2" role="list">
          {currentItems.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 text-sm">
              <span className="text-foreground">
                {isAr ? item.product.titleAr : item.product.titleEn}
              </span>
              <button
                type="button"
                onClick={() => void removeItem(item.product.id, isAr ? item.product.titleAr : item.product.titleEn)}
                disabled={busy}
                className="shrink-0 text-xs text-destructive hover:underline disabled:opacity-60 cursor-pointer"
              >
                {isAr ? 'حذف' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          {isAr ? 'لا توجد منتجات في هذه الباقة بعد' : 'No products in this bundle yet'}
        </p>
      )}

      {/* Add product */}
      {available.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={busy}
            className="input-brand text-sm flex-1 min-w-[200px] max-w-xs"
          >
            <option value="">{isAr ? 'اختر منتجًا…' : 'Select a product…'}</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {isAr ? p.titleAr : p.titleEn}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void addItem()}
            disabled={!selected || busy}
            className="btn-primary text-sm px-4 py-2 rounded-md disabled:opacity-60"
          >
            {busy ? (isAr ? 'جارٍ الإضافة…' : 'Adding…') : (isAr ? 'إضافة' : 'Add')}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
