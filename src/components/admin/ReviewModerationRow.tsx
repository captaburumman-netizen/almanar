'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { StarRating }              from '@/components/reviews/StarRating'

interface ReviewRow {
  id:        string
  rating:    number
  comment:   string | null
  status:    'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: Date | string
  user:      { name: string | null; email: string }
  course:    { titleEn: string; slug: string } | null
  product:   { titleEn: string; slug: string } | null
}

interface Props {
  review: ReviewRow
  locale: string
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:  'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

export function ReviewModerationRow({ review, locale: _locale }: Props) {
  const router   = useRouter()
  const [status, setStatus]   = useState(review.status)
  const [deleted, setDeleted] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (deleted) return null

  async function handleStatus(newStatus: 'APPROVED' | 'REJECTED') {
    startTransition(async () => {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setStatus(newStatus)
        router.refresh()
      }
    })
  }

  async function handleDelete() {
    if (!confirm('Delete this review permanently?')) return
    startTransition(async () => {
      const res = await fetch(`/api/admin/reviews/${review.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleted(true)
        router.refresh()
      }
    })
  }

  const subject = review.course
    ? `Course: ${review.course.titleEn}`
    : review.product
      ? `Product: ${review.product.titleEn}`
      : 'Unknown'

  const dateStr = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' })
    .format(new Date(review.createdAt))

  return (
    <li className="px-5 py-4 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Left: author + subject */}
        <div className="space-y-0.5 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {review.user.name || review.user.email}
          </p>
          <p className="text-xs text-gray-500 truncate">{subject}</p>
          <div className="flex items-center gap-2 mt-1">
            <StarRating rating={review.rating} size="sm" />
            <time className="text-xs text-gray-400">{dateStr}</time>
          </div>
        </div>

        {/* Right: status + actions */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[status]}`}>
            {status}
          </span>

          {status !== 'APPROVED' && (
            <button
              type="button"
              onClick={() => handleStatus('APPROVED')}
              disabled={isPending}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
              Approve
            </button>
          )}
          {status !== 'REJECTED' && (
            <button
              type="button"
              onClick={() => handleStatus('REJECTED')}
              disabled={isPending}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
              Reject
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 cursor-pointer transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
          {review.comment}
        </p>
      )}
    </li>
  )
}
