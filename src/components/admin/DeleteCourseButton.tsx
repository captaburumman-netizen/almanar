/**
 * Delete course button with confirmation.
 * Navigates to /admin/courses after deletion.
 */
'use client'

import { useState }    from 'react'
import { useRouter }   from 'next/navigation'

interface DeleteCourseButtonProps {
  courseId: string
  locale:   string
}

export function DeleteCourseButton({ courseId, locale }: DeleteCourseButtonProps) {
  const router  = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this course permanently? This cannot be undone.')) return
    setBusy(true)
    await fetch(`/api/admin/courses/${courseId}`, { method: 'DELETE' })
    router.push(`/${locale}/admin/courses`)
  }

  return (
    <button
      type="button"
      onClick={() => void handleDelete()}
      disabled={busy}
      className="text-sm text-destructive border border-destructive/40 rounded-md px-3 py-1.5 hover:bg-destructive/5 disabled:opacity-60 transition-colors"
    >
      {busy ? 'Deleting…' : 'Delete Course'}
    </button>
  )
}
