/**
 * Search + role filter bar for the users list.
 * Pushes updates to the URL as query params (server-rendered filtering).
 */
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback }                              from 'react'

interface UserSearchProps {
  initialQ:    string
  initialRole: string
}

export function UserSearch({ initialQ, initialRole }: UserSearchProps) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  const push = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(updates)) {
        if (v) params.set(k, v)
        else   params.delete(k)
      }
      params.delete('page') // reset to page 1 on filter change
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <input
        type="search"
        defaultValue={initialQ}
        placeholder="Search by name or email…"
        className="input-brand max-w-xs text-sm"
        onChange={(e) => push({ q: e.target.value })}
      />
      <select
        defaultValue={initialRole}
        className="input-brand w-36 text-sm"
        onChange={(e) => push({ role: e.target.value })}
      >
        <option value="">All roles</option>
        <option value="STUDENT">Student</option>
        <option value="ADMIN">Admin</option>
      </select>
    </div>
  )
}
