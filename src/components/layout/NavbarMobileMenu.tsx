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
import { AnimatePresence, motion } from 'motion/react'

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

  const slideX = locale === 'ar' ? '-100%' : '100%'

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
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.svg
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5" aria-hidden
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </motion.svg>
          ) : (
            <motion.svg
              key="hamburger"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5" aria-hidden
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </motion.svg>
          )}
        </AnimatePresence>
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-hidden
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: slideX }}
            animate={{ x: 0 }}
            exit={{ x: slideX }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className={[
              'fixed inset-y-0 z-50 w-72 bg-background shadow-xl lg:hidden',
              'flex flex-col gap-1 p-6 pt-20',
              locale === 'ar' ? 'start-0' : 'end-0',
            ].join(' ')}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Mobile search */}
            <SearchBar locale={locale} variant="mobile" />

            {NAV_LINKS.map(({ href, key }, index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: locale === 'ar' ? -16 : 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + index * 0.06, duration: 0.25 }}
              >
                <Link
                  href={href as '/courses' | '/store' | '/pricing'}
                  className="flex items-center rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {t(key)}
                </Link>
              </motion.div>
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
