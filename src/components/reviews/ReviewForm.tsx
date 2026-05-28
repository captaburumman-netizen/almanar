'use client'

import { useState, useTransition } from 'react'
// StarRating imported on demand when inline rating display is added

interface Props {
  courseId?:  string
  productId?: string
  locale:     'en' | 'ar'
  /** If user already submitted a review, pre-populate */
  existing?: { rating: number; comment: string | null }
}

export function ReviewForm({ courseId, productId, locale, existing }: Props) {
  const isAr = locale === 'ar'

  const [rating,    setRating]    = useState(existing?.rating  ?? 0)
  const [hovered,   setHovered]   = useState(0)
  const [comment,   setComment]   = useState(existing?.comment ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [errMsg,    setErrMsg]    = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { setErrMsg(isAr ? 'يرجى اختيار تقييم' : 'Please select a rating'); return }
    setErrMsg('')

    startTransition(async () => {
      try {
        const res = await fetch('/api/reviews', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ courseId, productId, rating, comment: comment.trim() || null }),
        })
        const json = await res.json()
        if (res.ok) {
          setSubmitted(true)
        } else {
          setErrMsg(json.error ?? (isAr ? 'حدث خطأ' : 'Something went wrong'))
        }
      } catch {
        setErrMsg(isAr ? 'حدث خطأ، حاول مجدداً' : 'Something went wrong, please retry')
      }
    })
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-center space-y-1">
        <p className="text-sm font-semibold text-green-700">
          {isAr ? 'شكراً على تقييمك!' : 'Thank you for your review!'}
        </p>
        <p className="text-xs text-green-600">
          {isAr
            ? 'سيظهر تقييمك بعد مراجعته من فريقنا.'
            : "Your review will appear after it's been moderated."}
        </p>
      </div>
    )
  }

  const displayRating = hovered || rating

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      <h3 className="text-base font-semibold text-foreground">
        {existing
          ? (isAr ? 'تعديل تقييمك' : 'Edit Your Review')
          : (isAr ? 'أضف تقييمك' : 'Leave a Review')}
      </h3>

      {/* Star picker */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{isAr ? 'التقييم *' : 'Rating *'}</p>
        <div className="flex gap-1" role="radiogroup" aria-label={isAr ? 'التقييم' : 'Rating'}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={`${star} ${isAr ? 'نجوم' : 'stars'}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="cursor-pointer p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              <svg className="h-8 w-8" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill={displayRating >= star ? '#F59E0B' : '#E5E7EB'}
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  className="transition-colors"
                />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          {isAr ? 'تعليقك (اختياري)' : 'Comment (optional)'}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={isAr ? 'شاركنا تجربتك…' : 'Share your experience…'}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
        <p className="text-right text-xs text-gray-400 mt-0.5">{comment.length}/1000</p>
      </div>

      {errMsg && <p className="text-xs text-red-600">{errMsg}</p>}

      <button
        type="submit"
        disabled={isPending || rating === 0}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer transition-colors"
      >
        {isPending
          ? (isAr ? 'جارٍ الإرسال…' : 'Submitting…')
          : (isAr ? 'إرسال التقييم' : 'Submit Review')}
      </button>
    </form>
  )
}
