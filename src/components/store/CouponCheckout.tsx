'use client'

/**
 * CouponCheckout
 *
 * Client component rendered inside the paid-product purchase card.
 * Lets the user apply a coupon code; updates the checkout link in real-time.
 */
import { useState, useTransition } from 'react'

interface Props {
  /** Base checkout URL without couponCode param, e.g. /api/store/checkout?productId=...&locale=ar */
  checkoutHref:  string
  /** Original price in USD */
  originalPrice: number
  locale:        'en' | 'ar'
  /** Context for coupon scope validation */
  productId?:    string
  bundleId?:     string
  /** Label for the buy button when no coupon active */
  buyLabel:      string
  /** Small note below button */
  note?:         string
}

function formatUSD(amount: number, locale: string) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    style:    'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function CouponCheckout({
  checkoutHref,
  originalPrice,
  locale,
  productId,
  bundleId,
  buyLabel,
  note,
}: Props) {
  const isAr = locale === 'ar'

  const [code,       setCode]       = useState('')
  const [applied,    setApplied]    = useState<string | null>(null)   // applied code
  const [discount,   setDiscount]   = useState(0)
  const [errMsg,     setErrMsg]     = useState('')
  const [isPending,  startTransition] = useTransition()

  const finalPrice   = Math.max(0, originalPrice - discount)
  const checkoutUrl  = applied
    ? `${checkoutHref}&couponCode=${encodeURIComponent(applied)}`
    : checkoutHref

  const priceLabel = applied
    ? formatUSD(finalPrice, locale)
    : buyLabel

  async function handleApply() {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return

    setErrMsg('')

    startTransition(async () => {
      try {
        const res = await fetch('/api/coupons/validate', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            code:          trimmed,
            originalPrice,
            productId,
            bundleId,
          }),
        })

        const json = await res.json()

        if (json.valid) {
          const savings = originalPrice - (json.finalPrice ?? originalPrice)
          setDiscount(savings)
          setApplied(trimmed)
          setErrMsg('')
        } else {
          setDiscount(0)
          setApplied(null)
          setErrMsg(json.error ?? (isAr ? 'كود غير صالح' : 'Invalid coupon'))
        }
      } catch {
        setErrMsg(isAr ? 'حدث خطأ، حاول مجدداً' : 'Something went wrong')
      }
    })
  }

  function handleRemove() {
    setApplied(null)
    setDiscount(0)
    setCode('')
    setErrMsg('')
  }

  return (
    <div className="space-y-3">
      {/* Coupon input */}
      {!applied ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            placeholder={isAr ? 'كود الخصم' : 'Coupon code'}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono uppercase placeholder:normal-case focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            dir="ltr"
          />
          <button
            type="button"
            onClick={handleApply}
            disabled={isPending || !code.trim()}
            className="rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {isPending
              ? (isAr ? '…' : '…')
              : (isAr ? 'تطبيق' : 'Apply')
            }
          </button>
        </div>
      ) : (
        /* Applied coupon badge */
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          <div className="text-sm">
            <span className="font-mono font-semibold text-green-700">{applied}</span>
            <span className="ml-2 text-green-600">
              {isAr
                ? `وفّرت ${formatUSD(discount, locale)}`
                : `– ${formatUSD(discount, locale)} off`
              }
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-green-600 hover:text-green-800 cursor-pointer ml-2"
            aria-label={isAr ? 'إزالة الكود' : 'Remove coupon'}
          >
            ✕
          </button>
        </div>
      )}

      {/* Error */}
      {errMsg && (
        <p className="text-xs text-red-600">{errMsg}</p>
      )}

      {/* Price display when coupon applied */}
      {applied && (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">{formatUSD(finalPrice, locale)}</span>
          <span className="text-sm text-muted-foreground line-through">{formatUSD(originalPrice, locale)}</span>
        </div>
      )}

      {/* Buy button */}
      <a
        href={checkoutUrl}
        className="block w-full rounded-lg bg-primary py-3 text-center font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {applied
          ? (isAr ? `شراء بـ ${formatUSD(finalPrice, locale)}` : `Buy for ${formatUSD(finalPrice, locale)}`)
          : priceLabel
        }
      </a>

      {/* Note */}
      {note && (
        <p className="text-center text-xs text-muted-foreground">{note}</p>
      )}
    </div>
  )
}
