'use client'

import { useState }  from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  couponId: string
  locale:   string
  code:     string
}

export function DeleteCouponButton({ couponId, locale, code }: Props) {
  const router   = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete coupon "${code}"? This cannot be undone.`)) return
    setBusy(true)
    await fetch(`/api/admin/coupons/${couponId}`, { method: 'DELETE' })
    router.push(`/${locale}/admin/coupons`)
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer transition-colors"
    >
      {busy ? 'Deleting…' : 'Delete Coupon'}
    </button>
  )
}
