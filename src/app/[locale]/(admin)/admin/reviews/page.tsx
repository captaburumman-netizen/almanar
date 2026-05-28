/**
 * Admin reviews moderation — /[locale]/admin/reviews
 *
 * Status filter pills + paginated list with approve / reject / delete actions.
 */
import { Link }         from '@/i18n/navigation'
import { db }           from '@/lib/db'
import type { Locale }  from '@/i18n/routing'
import type { ReviewStatus } from '@prisma/client'
import { ReviewModerationRow } from '@/components/admin/ReviewModerationRow'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'Reviews — Admin' }
}

interface Props {
  params:      Promise<{ locale: Locale }>
  searchParams: Promise<{ status?: string; page?: string }>
}

const STATUS_OPTIONS: { value: ReviewStatus | 'ALL'; labelEn: string; color: string }[] = [
  { value: 'ALL',      labelEn: 'All',      color: 'bg-gray-100 text-gray-700' },
  { value: 'PENDING',  labelEn: 'Pending',  color: 'bg-yellow-100 text-yellow-700' },
  { value: 'APPROVED', labelEn: 'Approved', color: 'bg-green-100 text-green-700'  },
  { value: 'REJECTED', labelEn: 'Rejected', color: 'bg-red-100 text-red-700'     },
]

const PAGE_SIZE = 20

export default async function AdminReviewsPage({ params, searchParams }: Props) {
  const { locale }              = await params
  const { status: statusParam, page: pageParam } = await searchParams

  const validStatuses: ReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED']
  const statusFilter = (validStatuses.includes(statusParam as ReviewStatus) ? statusParam : undefined) as ReviewStatus | undefined
  const page         = Math.max(1, parseInt(pageParam ?? '1', 10))

  const where = statusFilter ? { status: statusFilter } : {}

  const [reviews, total, pendingCount] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
      select: {
        id:        true,
        rating:    true,
        comment:   true,
        status:    true,
        createdAt: true,
        user:    { select: { name: true, email: true } },
        course:  { select: { titleEn: true, slug: true } },
        product: { select: { titleEn: true, slug: true } },
      },
    }).catch(() => []),
    db.review.count({ where }).catch(() => 0),
    db.review.count({ where: { status: 'PENDING' } }).catch(() => 0),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams()
    if (params.status) sp.set('status', params.status)
    if (params.page && params.page !== '1') sp.set('page', params.page)
    const q = sp.toString()
    return `/${locale}/admin/reviews${q ? `?${q}` : ''}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} review{total !== 1 ? 's' : ''}
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                {pendingCount} pending
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map(({ value, labelEn, color }) => {
          const active = value === 'ALL' ? !statusFilter : statusFilter === value
          return (
            <Link
              key={value}
              href={buildUrl({ status: value === 'ALL' ? undefined : value }) as any}
              className={[
                'rounded-full px-4 py-1.5 text-sm font-semibold transition-all',
                active ? color + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
              ].join(' ')}
            >
              {labelEn}
            </Link>
          )
        })}
      </div>

      {/* Reviews table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {reviews.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No reviews found.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100" role="list">
            {reviews.map((review) => (
              <ReviewModerationRow
                key={review.id}
                review={review as any}
                locale={locale}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildUrl({ status: statusFilter, page: String(page - 1) }) as any}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildUrl({ status: statusFilter, page: String(page + 1) }) as any}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
