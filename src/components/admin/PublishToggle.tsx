/**
 * Optimistic publish/unpublish toggle.
 *
 * Calls PATCH on the given API endpoint with { isPublished: !current }.
 * Shows a loading spinner during the request and rolls back on failure.
 */
'use client'

import { useState } from 'react'

interface PublishToggleProps {
  id:          string
  published:   boolean
  endpoint:    string   // e.g. /api/admin/courses/[id]
  onToggled?:  (_id: string, _published: boolean) => void
}

export function PublishToggle({ id, published, endpoint, onToggled }: PublishToggleProps) {
  const [isPublished, setIsPublished] = useState(published)
  const [loading,     setLoading]     = useState(false)

  async function toggle() {
    const next = !isPublished
    setIsPublished(next) // optimistic
    setLoading(true)

    try {
      const res = await fetch(endpoint, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isPublished: next }),
      })

      if (!res.ok) throw new Error('Failed')

      onToggled?.(id, next)
    } catch {
      setIsPublished(!next) // rollback
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
        'cursor-pointer disabled:opacity-60',
        isPublished
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-muted text-muted-foreground hover:bg-muted/80',
      ].join(' ')}
      aria-label={isPublished ? 'Unpublish' : 'Publish'}
    >
      {loading ? (
        <span className="animate-spin inline-block w-3 h-3 border border-current rounded-full border-t-transparent" />
      ) : (
        <span className={['w-1.5 h-1.5 rounded-full', isPublished ? 'bg-green-500' : 'bg-muted-foreground'].join(' ')} />
      )}
      {isPublished ? 'Live' : 'Draft'}
    </button>
  )
}
