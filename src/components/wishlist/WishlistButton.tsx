/**
 * WishlistButton — heart icon that toggles wishlist status.
 *
 * Props:
 *   courseId | productId  — exactly one must be provided
 *   initialSaved          — initial server-side wishlist state
 *   locale                — for aria-label localisation
 *   size                  — 'sm' (icon only) | 'md' (icon + text)
 *
 * Optimistic: UI flips immediately; server call runs in background.
 * Requires auth — navigates to /auth/signin if not logged in.
 */
'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'

interface WishlistButtonProps {
  courseId?:    string
  productId?:   string
  initialSaved: boolean
  locale:       string
  size?:        'sm' | 'md'
}

export function WishlistButton({
  courseId,
  productId,
  initialSaved,
  locale,
  size = 'sm',
}: WishlistButtonProps) {
  const [saved,     setSaved]     = useState(initialSaved)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const isAr   = locale === 'ar'

  async function toggle() {
    // Optimistic flip
    const next = !saved
    setSaved(next)

    startTransition(async () => {
      try {
        const body = courseId ? { courseId } : { productId }
        const res  = await fetch('/api/wishlist', {
          method:  next ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })

        if (res.status === 401) {
          // Not logged in — revert and redirect
          setSaved(!next)
          router.push(`/${locale}/auth/signin`)
          return
        }

        if (!res.ok) {
          // Revert on server error
          setSaved(!next)
        }
      } catch {
        setSaved(!next)
      }
    })
  }

  const label = saved
    ? (isAr ? 'إزالة من المحفوظات' : 'Remove from saved')
    : (isAr ? 'حفظ للمشاهدة لاحقاً' : 'Save for later')

  if (size === 'md') {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-label={label}
        aria-pressed={saved}
        className={[
          'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer disabled:opacity-60',
          saved
            ? 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100'
            : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
        ].join(' ')}
      >
        <HeartIcon filled={saved} />
        <span>{saved ? (isAr ? 'محفوظ' : 'Saved') : (isAr ? 'حفظ' : 'Save')}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-label={label}
      aria-pressed={saved}
      className={[
        'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors cursor-pointer disabled:opacity-60',
        saved
          ? 'border-rose-300 bg-rose-50 text-rose-500 hover:bg-rose-100'
          : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
      ].join(' ')}
    >
      <HeartIcon filled={saved} />
    </button>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  )
}
