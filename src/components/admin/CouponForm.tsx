'use client'

import { useState }       from 'react'
import { useRouter }      from 'next/navigation'

interface CouponFormProps {
  locale:    'en' | 'ar'
  couponId?: string
  initial?:  {
    code:          string
    discountType:  'PERCENT' | 'FIXED_AMOUNT'
    discountValue: number
    courseId:      string | null
    productId:     string | null
    bundleId:      string | null
    usageLimit:    number | null
    validFrom:     string
    validUntil:    string | null
    isActive:      boolean
  }
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10) // 'YYYY-MM-DD'
}

export function CouponForm({ locale, couponId, initial }: CouponFormProps) {
  const router  = useRouter()
  const isEdit  = Boolean(couponId)

  const [code,          setCode]          = useState(initial?.code          ?? '')
  const [discountType,  setDiscountType]  = useState<'PERCENT' | 'FIXED_AMOUNT'>(initial?.discountType  ?? 'PERCENT')
  const [discountValue, setDiscountValue] = useState(String(initial?.discountValue ?? ''))
  const [courseId,      setCourseId]      = useState(initial?.courseId   ?? '')
  const [productId,     setProductId]     = useState(initial?.productId  ?? '')
  const [bundleId,      setBundleId]      = useState(initial?.bundleId   ?? '')
  const [usageLimit,    setUsageLimit]    = useState(initial?.usageLimit != null ? String(initial.usageLimit) : '')
  const [validFrom,     setValidFrom]     = useState(toDateInput(initial?.validFrom))
  const [validUntil,    setValidUntil]    = useState(toDateInput(initial?.validUntil))
  const [isActive,      setIsActive]      = useState(initial?.isActive ?? true)
  const [error,         setError]         = useState('')
  const [saving,        setSaving]        = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload = {
      code:          code.trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      courseId:      courseId.trim()  || null,
      productId:     productId.trim() || null,
      bundleId:      bundleId.trim()  || null,
      usageLimit:    usageLimit !== '' ? Number(usageLimit) : null,
      validFrom:     validFrom  || undefined,
      validUntil:    validUntil || null,
      isActive,
    }

    const url    = isEdit ? `/api/admin/coupons/${couponId}` : '/api/admin/coupons'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong')
      setSaving(false)
      return
    }

    if (isEdit) {
      router.refresh()
    } else {
      router.push(`/${locale}/admin/coupons/${json.coupon.id}`)
    }
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Code */}
      <div>
        <label className={labelCls}>Coupon Code *</label>
        <input
          className={`${inputCls} font-mono uppercase`}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. SUMMER25"
          required
          disabled={isEdit}
        />
        {isEdit && (
          <p className="mt-1 text-xs text-gray-500">Code cannot be changed after creation.</p>
        )}
      </div>

      {/* Discount type + value */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Discount Type *</label>
          <select
            className={inputCls}
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as 'PERCENT' | 'FIXED_AMOUNT')}
            required
          >
            <option value="PERCENT">Percent (%)</option>
            <option value="FIXED_AMOUNT">Fixed Amount ($)</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>
            {discountType === 'PERCENT' ? 'Discount (%)' : 'Discount ($)'} *
          </label>
          <input
            type="number"
            min={0.01}
            max={discountType === 'PERCENT' ? 100 : undefined}
            step="0.01"
            className={inputCls}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Scope — optional */}
      <div>
        <label className={labelCls}>Scope (leave blank for all products)</label>
        <div className="space-y-2">
          <input
            className={inputCls}
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            placeholder="Course ID (optional)"
          />
          <input
            className={inputCls}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="Product ID (optional)"
          />
          <input
            className={inputCls}
            value={bundleId}
            onChange={(e) => setBundleId(e.target.value)}
            placeholder="Bundle ID (optional)"
          />
        </div>
      </div>

      {/* Usage limit */}
      <div>
        <label className={labelCls}>Usage Limit (leave blank for unlimited)</label>
        <input
          type="number"
          min={1}
          step={1}
          className={inputCls}
          value={usageLimit}
          onChange={(e) => setUsageLimit(e.target.value)}
          placeholder="e.g. 100"
        />
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Valid From</label>
          <input
            type="date"
            className={inputCls}
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Valid Until (leave blank for no expiry)</label>
          <input
            type="date"
            className={inputCls}
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsActive((v) => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isActive ? 'bg-indigo-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isActive ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm font-medium text-gray-700">
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors"
        >
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Coupon'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
