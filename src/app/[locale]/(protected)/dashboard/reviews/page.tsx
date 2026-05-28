/**
 * /dashboard/reviews — My Reviews
 *
 * Lists all reviews the authenticated user has submitted.
 * Each card shows the target (course/product), rating, status badge,
 * comment snippet, date, and a delete button.
 *
 * Delete is done via a small Client island so the page stays a Server Component.
 */
import { redirect }         from 'next/navigation'
import { getServerSession } from 'next-auth'
import Image                from 'next/image'
import { Link }             from '@/i18n/navigation'
import { authOptions }      from '@/lib/auth'
import { getUserReviews }   from '@/lib/reviews'
import { StarRating }       from '@/components/reviews/StarRating'
import { DeleteReviewButton } from '@/components/reviews/DeleteReviewButton'
import type { Locale }      from '@/i18n/routing'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ locale: Locale }> }

const STATUS_BADGE: Record<string, { en: string; ar: string; cls: string }> = {
  PENDING:  { en: 'Pending',   ar: 'قيد المراجعة', cls: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { en: 'Approved',  ar: 'مقبول',         cls: 'bg-green-100  text-green-800'  },
  REJECTED: { en: 'Rejected',  ar: 'مرفوض',         cls: 'bg-red-100    text-red-800'    },
}

export default async function MyReviewsPage({ params }: PageProps) {
  const { locale } = await params
  const isAr       = locale === 'ar'

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect(`/${locale}/auth/signin`)

  const reviews = await getUserReviews(session.user.id).catch(() => [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isAr ? 'تقييماتي' : 'My Reviews'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAr
              ? 'جميع التقييمات التي قدّمتها للدورات والمنتجات'
              : 'All reviews you have submitted for courses and products'}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {isAr ? 'لوحة التحكم' : 'Dashboard'}
        </Link>
      </div>

      {/* Empty state */}
      {reviews.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/30 py-20 text-center">
          <svg className="h-10 w-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
          <div>
            <p className="font-semibold text-foreground">
              {isAr ? 'لا توجد تقييمات بعد' : 'No reviews yet'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAr
                ? 'أكمل إحدى دوراتك لتتمكن من تقييمها'
                : 'Complete a course or purchase a product to leave a review'}
            </p>
          </div>
          <Link
            href="/courses"
            className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {isAr ? 'استعرض الدورات' : 'Browse Courses'}
          </Link>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length > 0 && (
        <ul className="space-y-4" role="list">
          {reviews.map((review) => {
            const target     = review.course  ?? review.product
            const targetSlug = review.course
              ? `/courses/${review.course.slug}`
              : `/store/${review.product?.slug}`
            const targetTitle = isAr
              ? (target?.titleAr ?? target?.titleEn ?? '—')
              : (target?.titleEn ?? '—')
            const badge      = STATUS_BADGE[review.status] ?? STATUS_BADGE.PENDING!
            const thumbnail  = review.course?.thumbnail ?? null

            return (
              <li
                key={review.id}
                className="flex gap-4 rounded-xl border border-border bg-background p-4"
              >
                {/* Thumbnail */}
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {thumbnail ? (
                    <Image src={thumbnail} alt={targetTitle} fill className="object-cover" sizes="96px" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <svg className="h-6 w-6 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={targetSlug as `/courses/${string}` | `/store/${string}`}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
                      >
                        {targetTitle}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StarRating rating={review.rating} size="sm" />
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}
                        >
                          {isAr ? badge.ar : badge.en}
                        </span>
                        <time
                          dateTime={review.createdAt.toISOString()}
                          className="text-xs text-muted-foreground"
                        >
                          {new Intl.DateTimeFormat(isAr ? 'ar-SA' : 'en-GB', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          }).format(new Date(review.createdAt))}
                        </time>
                      </div>
                    </div>
                    <DeleteReviewButton reviewId={review.id} locale={locale} />
                  </div>

                  {review.comment && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {review.comment}
                    </p>
                  )}

                  {review.status === 'REJECTED' && (
                    <p className="text-xs text-red-600">
                      {isAr
                        ? 'لم يستوفِ تقييمك معايير المحتوى. يمكنك تعديله وإعادة إرساله.'
                        : 'Your review did not meet content guidelines. You can edit and resubmit it.'}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
