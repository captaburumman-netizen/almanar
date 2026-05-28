/**
 * Delete product button with confirmation.
 */
'use client'

import { useState }    from 'react'
import { useRouter }   from 'next/navigation'

interface DeleteProductButtonProps {
  productId: string
  locale:    string
}

export function DeleteProductButton({ productId, locale }: DeleteProductButtonProps) {
  const router  = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this product permanently? This cannot be undone.')) return
    setBusy(true)
    await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' })
    router.push(`/${locale}/admin/products`)
  }

  return (
    <button
      type="button"
      onClick={() => void handleDelete()}
      disabled={busy}
      className="text-sm text-destructive border border-destructive/40 rounded-md px-3 py-1.5 hover:bg-destructive/5 disabled:opacity-60 transition-colors"
    >
      {busy ? 'Deleting…' : 'Delete Product'}
    </button>
  )
}
