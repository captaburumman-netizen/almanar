/**
 * Toggle a user's role between STUDENT and ADMIN.
 * Calls PATCH /api/admin/users/[userId] and refreshes the page.
 */
'use client'

import { useState }    from 'react'
import { useRouter }   from 'next/navigation'
import type { Role }   from '@prisma/client'

interface RoleToggleProps {
  userId:      string
  currentRole: Role
}

export function RoleToggle({ userId, currentRole }: RoleToggleProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const nextRole: Role = currentRole === 'ADMIN' ? 'STUDENT' : 'ADMIN'
  const label          = currentRole === 'ADMIN'
    ? 'Demote to Student'
    : 'Promote to Admin'

  async function toggle() {
    if (!confirm(`${label}?`)) return
    setBusy(true)
    await fetch(`/api/admin/users/${userId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ role: nextRole }),
    })
    router.refresh()
    setBusy(false)
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      className={[
        'text-xs border rounded-md px-2.5 py-1.5 transition-colors disabled:opacity-60',
        currentRole === 'ADMIN'
          ? 'border-destructive/40 text-destructive hover:bg-destructive/5'
          : 'border-primary/40 text-primary hover:bg-primary/5',
      ].join(' ')}
    >
      {busy ? '…' : label}
    </button>
  )
}
