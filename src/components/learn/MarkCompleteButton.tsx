/**
 * MarkCompleteButton — toggle lesson completion state via the progress API.
 *
 * Optimistically updates the UI, rolls back on API failure.
 * Client component.
 */
'use client'

import { useState, useTransition } from 'react'

interface MarkCompleteButtonProps {
  lessonId:         string
  initialCompleted: boolean
  locale:           string
}

export function MarkCompleteButton({
  lessonId,
  initialCompleted,
  locale,
}: MarkCompleteButtonProps) {
  const [completed, setCompleted] = useState(initialCompleted)
  const [pending, startTransition] = useTransition()
  const isAr = locale === 'ar'

  async function toggle() {
    const next = !completed
    setCompleted(next) // optimistic

    startTransition(async () => {
      try {
        const res = await fetch(`/api/lessons/${lessonId}/progress`, {
          method: next ? 'POST' : 'DELETE',
        })
        if (!res.ok) throw new Error('Failed')
      } catch {
        setCompleted(!next) // rollback
      }
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-pressed={completed}
      className={[
        'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        completed
          ? 'bg-sage text-white hover:bg-sage/90'
          : 'border border-border bg-background text-foreground hover:bg-muted',
        pending ? 'opacity-60 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {/* Check icon */}
      <svg
        className={`h-4 w-4 shrink-0 ${completed ? 'text-white' : 'text-muted-foreground'}`}
        fill={completed ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          d="M5 13l4 4L19 7"
        />
      </svg>
      {completed
        ? (isAr ? 'مكتمل' : 'Completed')
        : (isAr ? 'وسّم كمكتمل' : 'Mark Complete')}
    </button>
  )
}
