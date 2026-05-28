'use client'

/**
 * PricingToggle — monthly/annual billing switcher.
 *
 * Shows/hides the appropriate [data-billing] elements on the page
 * via DOM class toggling. Avoids a server round-trip for the simple
 * monthly ↔ annual switch.
 */
import { useState, useEffect } from 'react'
import { useTranslations }     from 'next-intl'
import { cn }                  from '@/lib/utils'

interface PricingToggleProps {
  locale: string
}

export function PricingToggle({ locale }: PricingToggleProps) {
  const t = useTranslations('pricing')
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  // Sync DOM data-billing elements when billing changes
  useEffect(() => {
    const monthly = document.querySelectorAll('[data-billing="monthly"]')
    const annual  = document.querySelectorAll('[data-billing="annual"]')
    if (billing === 'monthly') {
      monthly.forEach((el) => el.classList.remove('hidden'))
      annual.forEach((el)  => el.classList.add('hidden'))
    } else {
      monthly.forEach((el) => el.classList.add('hidden'))
      annual.forEach((el)  => el.classList.remove('hidden'))
    }
  }, [billing])

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-input bg-background p-1">
      <button
        type="button"
        onClick={() => setBilling('monthly')}
        className={cn(
          'rounded-full px-5 py-1.5 text-sm font-medium transition-colors cursor-pointer',
          billing === 'monthly'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {t('monthly')}
      </button>
      <button
        type="button"
        onClick={() => setBilling('annual')}
        className={cn(
          'rounded-full px-5 py-1.5 text-sm font-medium transition-colors cursor-pointer flex items-center gap-2',
          billing === 'annual'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {t('annual')}
        <span className={cn(
          'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
          billing === 'annual'
            ? 'bg-white/20 text-white'
            : 'bg-sage/15 text-sage-dark'
        )}>
          {locale === 'ar' ? 'وفّر' : 'SAVE'}
        </span>
      </button>
    </div>
  )
}
