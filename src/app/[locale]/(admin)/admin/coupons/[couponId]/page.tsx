/**
 * Admin — view / edit a coupon
 */
import { notFound }              from 'next/navigation'
import { db }                    from '@/lib/db'
import { CouponForm }            from '@/components/admin/CouponForm'
import { DeleteCouponButton }    from '@/components/admin/DeleteCouponButton'
import type { Locale }           from '@/i18n/routing'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ locale: Locale; couponId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { couponId } = await params
  const coupon = await db.coupon.findUnique({ where: { id: couponId }, select: { code: true } }).catch(() => null)
  return { title: coupon ? `${coupon.code} — Admin` : 'Coupon — Admin' }
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(d))
}

export default async function CouponDetailPage({ params }: Props) {
  const { locale, couponId } = await params

  const coupon = await db.coupon.findUnique({
    where:   { id: couponId },
    include: { _count: { select: { redemptions: true } } },
  }).catch(() => null)

  if (!coupon) notFound()

  const expired = coupon.validUntil && new Date(coupon.validUntil) < new Date()

  const initial = {
    code:          coupon.code,
    discountType:  coupon.discountType as 'PERCENT' | 'FIXED_AMOUNT',
    discountValue: Number(coupon.discountValue),
    courseId:      coupon.courseId,
    productId:     coupon.productId,
    bundleId:      coupon.bundleId,
    usageLimit:    coupon.usageLimit,
    validFrom:     coupon.validFrom.toISOString(),
    validUntil:    coupon.validUntil?.toISOString() ?? null,
    isActive:      coupon.isActive,
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold text-gray-900">{coupon.code}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {coupon._count.redemptions} redemption{coupon._count.redemptions !== 1 ? 's' : ''}
            {' · '}
            {coupon.usageLimit != null
              ? `${coupon.usageCount} / ${coupon.usageLimit} uses`
              : `${coupon.usageCount} uses (unlimited)`
            }
            {coupon.validUntil && (
              <span className={expired ? ' text-red-500' : ''}>
                {' · '}Expires {formatDate(coupon.validUntil)}
              </span>
            )}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
          coupon.isActive && !expired
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {coupon.isActive && !expired ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Edit form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <CouponForm locale={locale} couponId={couponId} initial={initial} />
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <h3 className="text-sm font-semibold text-red-700">Danger Zone</h3>
        <p className="mt-1 text-xs text-red-600">
          Deleting a coupon removes it and all its redemption records permanently.
        </p>
        <DeleteCouponButton couponId={couponId} locale={locale} code={coupon.code} />
      </div>
    </div>
  )
}
