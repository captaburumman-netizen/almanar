/**
 * ReviewList — server component.
 * Fetches approved reviews directly from DB and renders them.
 * Accepts optional userReview so the form shows pre-populated values for the current user.
 */
import { db }          from '@/lib/db'
import { StarRating }  from './StarRating'
import { ReviewForm }  from './ReviewForm'

interface Props {
  courseId?:   string
  productId?:  string
  locale:      'en' | 'ar'
  /** Authenticated user's existing review (if any) — for pre-populating ReviewForm */
  userReview?: { rating: number; comment: string | null } | null
  /** Whether user is eligible to leave a review (enrolled / purchased) */
  canReview:   boolean
}

function formatDate(d: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(d))
}

export async function ReviewList({ courseId, productId, locale, userReview, canReview }: Props) {
  const isAr = locale === 'ar'

  const reviews = await db.review.findMany({
    where: {
      status: 'APPROVED',
      ...(courseId  ? { courseId }  : {}),
      ...(productId ? { productId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take:    20,
    select: {
      id:        true,
      rating:    true,
      comment:   true,
      createdAt: true,
      user: { select: { name: true } },
    },
  }).catch(() => [])

  const total     = reviews.length
  const avgRating = total > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
    : null

  return (
    <section aria-labelledby="reviews-heading" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 id="reviews-heading" className="text-lg font-semibold text-foreground">
          {isAr ? 'التقييمات' : 'Reviews'}
        </h2>
        {avgRating !== null && (
          <div className="flex items-center gap-2">
            <StarRating rating={avgRating} size="sm" showValue />
            <span className="text-sm text-muted-foreground">
              ({total} {isAr ? 'تقييم' : total === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}
      </div>

      {/* Review form — for eligible users */}
      {canReview && (
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <ReviewForm
            courseId={courseId}
            productId={productId}
            locale={locale}
            existing={userReview ?? undefined}
          />
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          {isAr ? 'لا توجد تقييمات بعد.' : 'No reviews yet. Be the first!'}
        </p>
      ) : (
        <ul className="space-y-4" role="list">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-background p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    {r.user.name || (isAr ? 'مستخدم' : 'User')}
                  </p>
                  <StarRating rating={r.rating} size="sm" />
                </div>
                <time
                  dateTime={r.createdAt.toISOString()}
                  className="shrink-0 text-xs text-muted-foreground"
                >
                  {formatDate(r.createdAt, locale)}
                </time>
              </div>
              {r.comment && (
                <p className="text-sm text-foreground/80 leading-relaxed">{r.comment}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
