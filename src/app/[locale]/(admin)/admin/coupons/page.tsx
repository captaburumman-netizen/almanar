/**
 * Admin coupons list — /[locale]/admin/coupons
 */
import { Link }   from '@/i18n/navigation'
import { db }     from '@/lib/db'
import type { Locale } from '@/i18n/routing'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'Coupons — Admin' }
}

interface Props { params: Promise<{ locale: Locale }> }

function formatDate(d: Date | null | undefined): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(d))
}


export default async function AdminCouponsPage({ params }: Props) {
  const { locale } = await params

  const coupons = await db.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id:            true,
      code:          true,
      discountType:  true,
      discountValue: true,
      courseId:      true,
      productId:     true,
      bundleId:      true,
      usageLimit:    true,
      usageCount:    true,
      validUntil:    true,
      isActive:      true,
      _count: { select: { redemptions: true } },
    },
  }).catch(() => [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="mt-1 text-sm text-gray-500">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href={`/admin/coupons/new`}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          + New Coupon
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Discount</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Scope</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Used</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Expires</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  No coupons yet.
                </td>
              </tr>
            ) : (
              coupons.map((c) => {
                const discountStr = c.discountType === 'PERCENT'
                  ? `${Number(c.discountValue)}%`
                  : `$${Number(c.discountValue).toFixed(2)}`

                const scope = c.courseId
                  ? `Course: …${c.courseId.slice(-6)}`
                  : c.productId
                    ? `Product: …${c.productId.slice(-6)}`
                    : c.bundleId
                      ? `Bundle: …${c.bundleId.slice(-6)}`
                      : 'All'

                const usageStr = c.usageLimit != null
                  ? `${c.usageCount} / ${c.usageLimit}`
                  : `${c.usageCount} / ∞`

                const expired = c.validUntil && new Date(c.validUntil) < new Date()

                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{c.code}</td>
                    <td className="px-4 py-3 text-gray-700">{discountStr}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{scope}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{usageStr}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {expired
                        ? <span className="text-red-500">{formatDate(c.validUntil)}</span>
                        : formatDate(c.validUntil)
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        c.isActive && !expired
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {c.isActive && !expired ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/coupons/${c.id}`}
                        className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
