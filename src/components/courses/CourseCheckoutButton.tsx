/**
 * CourseCheckoutButton — client island for the course detail pricing card.
 *
 * Renders the correct CTA based on the user's state:
 *
 *   Enrolled        → "Continue Learning" (link)
 *   Free course     → "Start Learning" (link to /learn — auto-enroll on arrival)
 *   Member-only
 *     + not authed  → "Create Account" (link)
 *     + authed      → "Subscribe for Access" (link to /pricing)
 *   Paid course
 *     + not authed  → "Sign Up to Enroll" (link)
 *     + authed      → price tag + optional coupon field + "Buy" button
 *
 * On purchase: POSTs to /api/stripe/checkout then window.location → Stripe URL.
 */
'use client'

import { useState, useTransition } from 'react'
import { Link }                    from '@/i18n/navigation'

interface CourseCheckoutButtonProps {
  courseId:     string
  courseSlug:   string
  price:        number     // 0 for free
  isMemberOnly: boolean
  isEnrolled:   boolean
  isAuthed:     boolean
  locale:       string
}

export function CourseCheckoutButton({
  courseId,
  courseSlug,
  price,
  isMemberOnly,
  isEnrolled,
  isAuthed,
  locale,
}: CourseCheckoutButtonProps) {
  const isAr  = locale === 'ar'
  const isFree = price === 0 && !isMemberOnly

  const [coupon,    setCoupon]    = useState('')
  const [discount,  setDiscount]  = useState<number | null>(null)  // final price after coupon
  const [couponErr, setCouponErr] = useState('')
  const [couponOk,  setCouponOk]  = useState(false)
  const [errMsg,    setErrMsg]    = useState('')
  const [isPending, startTransition] = useTransition()

  // ── Case 1: already enrolled ──────────────────────────────────────────────
  if (isEnrolled) {
    return (
      <Link
        href={`/courses/${courseSlug}/learn` as `/courses/${string}/learn`}
        className="block w-full rounded-lg bg-sage py-3 text-center font-semibold text-white hover:bg-sage/90 transition-colors"
      >
        {isAr ? 'متابعة التعلم' : 'Continue Learning'}
      </Link>
    )
  }

  // ── Case 2: free course ───────────────────────────────────────────────────
  if (isFree) {
    return (
      <Link
        href={`/courses/${courseSlug}/learn` as `/courses/${string}/learn`}
        className="block w-full rounded-lg bg-primary py-3 text-center font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {isAr ? 'ابدأ التعلم مجانًا' : 'Start Learning — Free'}
      </Link>
    )
  }

  // ── Case 3: member-only ───────────────────────────────────────────────────
  if (isMemberOnly) {
    if (!isAuthed) {
      return (
        <Link
          href="/auth/signup"
          className="block w-full rounded-lg bg-primary py-3 text-center font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {isAr ? 'أنشئ حسابًا' : 'Create Account'}
        </Link>
      )
    }
    return (
      <Link
        href="/pricing"
        className="block w-full rounded-lg bg-primary py-3 text-center font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {isAr ? 'اشترك للوصول' : 'Subscribe for Access'}
      </Link>
    )
  }

  // ── Case 4: paid course, unauthenticated ──────────────────────────────────
  if (!isAuthed) {
    return (
      <Link
        href="/auth/signup"
        className="block w-full rounded-lg bg-primary py-3 text-center font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {isAr ? 'سجّل للوصول' : 'Sign Up to Enroll'}
      </Link>
    )
  }

  // ── Case 5: paid course, authenticated ───────────────────────────────────
  // displayPrice = discount ?? price  (reserved for future UI display)

  async function applyCoupon() {
    if (!coupon.trim()) return
    setCouponErr('')
    setCouponOk(false)
    startTransition(async () => {
      try {
        const res  = await fetch('/api/coupons/validate', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ code: coupon.trim(), originalPrice: price, courseId }),
        })
        const json = await res.json()
        if (json.valid && json.finalPrice !== undefined) {
          setDiscount(json.finalPrice)
          setCouponOk(true)
          setCouponErr('')
        } else {
          setDiscount(null)
          setCouponOk(false)
          setCouponErr(json.error ?? (isAr ? 'كود غير صالح' : 'Invalid coupon code'))
        }
      } catch {
        setCouponErr(isAr ? 'تعذّر التحقق من الكود' : 'Could not validate coupon')
      }
    })
  }

  function handleBuy() {
    setErrMsg('')
    startTransition(async () => {
      try {
        const res  = await fetch('/api/stripe/checkout', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            courseId,
            locale,
            ...(couponOk && coupon ? { couponCode: coupon.trim() } : {}),
          }),
        })
        const json = await res.json()
        if (res.ok && json.url) {
          window.location.href = json.url
        } else {
          setErrMsg(json.error ?? (isAr ? 'حدث خطأ' : 'Something went wrong'))
        }
      } catch {
        setErrMsg(isAr ? 'حدث خطأ في الاتصال' : 'Network error — please try again')
      }
    })
  }

  return (
    <div className="space-y-3">
      {/* Coupon code input */}
      <div className="space-y-1.5">
        <label className="block text-xs text-muted-foreground">
          {isAr ? 'رمز الخصم (اختياري)' : 'Coupon code (optional)'}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={coupon}
            onChange={(e) => {
              setCoupon(e.target.value.toUpperCase())
              setCouponOk(false)
              setDiscount(null)
              setCouponErr('')
            }}
            placeholder={isAr ? 'أدخل الكود' : 'Enter code'}
            className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary uppercase tracking-widest"
          />
          <button
            type="button"
            onClick={applyCoupon}
            disabled={isPending || !coupon.trim()}
            className="shrink-0 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
          >
            {isAr ? 'تطبيق' : 'Apply'}
          </button>
        </div>
        {couponOk && discount !== null && (
          <p className="text-xs text-green-600 font-medium">
            {isAr
              ? `✓ تم تطبيق الخصم — السعر الجديد: $${discount.toFixed(2)}`
              : `✓ Coupon applied — New price: $${discount.toFixed(2)}`}
          </p>
        )}
        {couponErr && <p className="text-xs text-red-600">{couponErr}</p>}
      </div>

      {/* Buy button */}
      <button
        type="button"
        onClick={handleBuy}
        disabled={isPending}
        className="block w-full rounded-lg bg-primary py-3 text-center font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors cursor-pointer"
      >
        {isPending
          ? (isAr ? 'جارٍ التحويل…' : 'Redirecting…')
          : discount !== null
            ? (isAr ? `سجّل مقابل $${discount.toFixed(2)}` : `Enroll for $${discount.toFixed(2)}`)
            : (isAr ? `سجّل مقابل $${price.toFixed(2)}` : `Enroll for $${price.toFixed(2)}`)}
      </button>

      {errMsg && <p className="text-xs text-red-600 text-center">{errMsg}</p>}
    </div>
  )
}
