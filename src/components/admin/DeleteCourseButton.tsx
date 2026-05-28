/**
 * Delete course button with confirmation.
 */
'use client'

import { useState }    from 'react'
import { useRouter }   from 'next/navigation'

interface Props {
  id:    string
  title: string
}

export function DeleteCourseButton({ id, title }: Props) {
  const router      = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${title}" permanently? This cannot be undone.`)) return
    setBusy(true)
    await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' })
    router.refresh()
    router.push('/admin/courses')
  }

  return (
    <button
      type="button"
      onClick={() => void handleDelete()}
      disabled={busy}
      className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-60 transition-colors cursor-pointer"
    >
      {busy ? 'Deleting…' : 'Delete'}
    </button>
  )
}
