'use client'

/**
 * LanguageSwitcher — toggles between /ar/* and /en/* routes.
 *
 * Uses next-intl's usePathname to read the current path, then builds a link
 * to the same page in the other locale via next-intl's Link component.
 */
import { useLocale } from 'next-intl'
import { usePathname, Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  className?: string
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const locale   = useLocale()
  const pathname = usePathname()

  const otherLocale = locale === 'ar' ? 'en' : 'ar'
  const label       = locale === 'ar' ? 'EN' : 'ع'
  const ariaLabel   = locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'

  return (
    <Link
      href={pathname}
      locale={otherLocale}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center justify-center',
        'h-9 w-12 rounded-lg border border-input bg-background',
        'text-sm font-semibold text-foreground',
        'hover:bg-accent hover:text-accent-foreground',
        'transition-colors duration-150 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      {label}
    </Link>
  )
}
