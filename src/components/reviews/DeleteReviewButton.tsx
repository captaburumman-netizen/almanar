/**
 * DeleteReviewButton — client island used by the My Reviews dashboard page.
 *
 * Calls DELETE /api/reviews/[id] then reloads via router.refresh().
 * Asks for confirmation before deleting.
 */
'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'

interface Props {
  reviewId: string
  locale:   string
}

export function DeleteReviewButton({ reviewId, locale }: Props) {
  const isAr = locale === 'ar'
  const [isPending, startTransition] = useTransition()
  const [errMsg,    setErrMsg]       = useState('')
  const router                       = useRouter()

  function handleDelete() {
    const confirmed = window.confirm(
      isAr
        ? 'هل أنت متأكد أنك تريد حذف هذا التقييم؟'
        : 'Are you sure you want to delete this review?'
    )
    if (!confirmed) return

    setErrMsg('')
    startTransition(async () => {
      try {
        const res = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' })
        if (res.ok) {
          router.refresh()
        } else {
          const json = await res.json().catch(() => ({}))
          setErrMsg(json.error ?? (isAr ? 'حدث خطأ' : 'Something went wrong'))
        }
      } catch {
        setErrMsg(isAr ? 'تعذّر الاتصال بالخادم' : 'Network error')
      }
    })
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        aria-label={isAr ? 'حذف التقييم' : 'Delete review'}
        title={isAr ? 'حذف' : 'Delete'}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition-colors"
      >
        {isPending ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" aria-hidden />
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
      </button>
      {errMsg && (
        <p className="mt-1 text-[10px] text-red-600 text-right">{errMsg}</p>
      )}
    </div>
  )
}
