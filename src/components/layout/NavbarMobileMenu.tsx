'use client'

/**
 * NavbarMobileMenu — slide-in drawer for small screens.
 *
 * Handles open/close state, closes on route change.
 * Rendered inside the server Navbar component.
 */
import { useState, useEffect } from 'react'
import { usePathname }          from 'next/navigation'
import { useTranslations }      from 'next-intl'
import { Link }                 from '@/i18n/navigation'
import { LanguageSwitcher }     from './LanguageSwitcher'
import { SearchBar }            from '@/components/search/SearchBar'

interface NavbarMobileMenuProps {
  locale:          string
  isAuthenticated: boolean
  isAdmin:         boolean
}

const NAV_LINKS = [
  { href: '/courses', key: 'courses' },
  { href: '/store',   key: 'store'   },
  { href: '/pricing', key: 'pricing' },
] as const

export function NavbarMobileMenu({ locale, isAuthenticated, isAdmin }: NavbarMobileMenuProps) {
  const t         = useTranslations('common.nav')
  const pathname  = usePathname()
  const [open, setOpen] = useState(false)

  // Close drawer on navigation
  useEffect(() => { setOpen(false) }, [pathname])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Hamburger button */}
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground hover:bg-accent transition-colors cursor-pointer lg:hidden"
      >
        {open ? (
          /* X icon */
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          /* Hamburger icon */
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5" aria-hidden>
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={[
          'fixed inset-y-0 z-50 w-72 bg-background shadow-xl lg:hidden',
          'flex flex-col gap-1 p-6 pt-20 transition-transform duration-300',
          locale === 'ar' ? 'start-0' : 'end-0',
          open
            ? 'translate-x-0'
            : locale === 'ar'
              ? '-translate-x-full'
              : 'translate-x-full',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Mobile search */}
        <SearchBar locale={locale} variant="mobile" />

        {NAV_LINKS.map(({ href, key }) => (
          <Link
            key={key}
            href={href as '/courses' | '/store' | '/pricing'}
            className="flex items-center rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {t(key)}
          </Link>
        ))}

        <div className="my-2 border-t border-border" />

        {isAuthenticated ? (
          <>
            <Link href="/dashboard" className="flex items-center rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-accent transition-colors">
              {t('dashboard')}
            </Link>
            {isAdmin && (
              <Link href="/admin" className="flex items-center rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-accent transition-colors">
                {t('admin')}
              </Link>
            )}
            <Link
              href={`/${locale}/auth/signin`}
              className="flex items-center rounded-lg px-3 py-2.5 text-base font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              {t('signout')}
            </Link>
          </>
        ) : (
          <>
            <Link href="/auth/signin" className="flex items-center rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-accent transition-colors">
              {t('signin')}
            </Link>
            <Link href="/auth/signup" className="flex items-center rounded-lg px-3 py-2.5 text-base font-semibold text-primary hover:bg-accent transition-colors">
              {t('signup')}
            </Link>
          </>
        )}

        <div className="mt-auto pt-4">
          <LanguageSwitcher />
        </div>
      </div>
    </>
  )
}
