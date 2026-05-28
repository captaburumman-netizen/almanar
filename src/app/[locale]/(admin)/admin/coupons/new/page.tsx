/**
 * Admin — create a new coupon
 */
import { CouponForm } from '@/components/admin/CouponForm'
import type { Locale } from '@/i18n/routing'

export async function generateMetadata() {
  return { title: 'New Coupon — Admin' }
}

interface Props { params: Promise<{ locale: Locale }> }

export default async function NewCouponPage({ params }: Props) {
  const { locale } = await params

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New Coupon</h1>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <CouponForm locale={locale} />
      </div>
    </div>
  )
}
