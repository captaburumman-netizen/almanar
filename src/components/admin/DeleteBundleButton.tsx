/**
 * DeleteBundleButton — confirm + DELETE /api/admin/bundles/[bundleId] + redirect.
 */
'use client'

import { useState }  from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  bundleId:     string
  redirectPath: string
}

export function DeleteBundleButton({ bundleId, redirectPath }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this bundle? This cannot be undone.')) return
    setBusy(true)
    await fetch(`/api/admin/bundles/${bundleId}`, { method: 'DELETE' })
    router.push(redirectPath)
  }

  return (
    <button
      type="button"
      onClick={() => void handleDelete()}
      disabled={busy}
      className="rounded-md border border-destructive/50 px-4 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-60 cursor-pointer"
    >
      {busy ? 'Deleting…' : 'Delete Bundle'}
    </button>
  )
}
