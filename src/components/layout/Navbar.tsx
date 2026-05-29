/**
 * Navbar — Premium glassmorphism floating navbar (Server Component).
 * Design: floating glass pill/bar, gold brand mark, RTL-safe.
 */
import { getServerSession } from 'next-auth'
import { getTranslations }   from 'next-intl/server'
import { authOptions }       from '@/lib/auth'
import { Link }              from '@/i18n/navigation'
import { LanguageSwitcher }  from './LanguageSwitcher'
import { NavbarMobileMenu }  from './NavbarMobileMenu'
import { SearchBar }         from '@/components/search/SearchBar'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { getUnreadCount }   from '@/lib/notifications'
import * as motion           from 'motion/react-client'

const NAV_LINKS = [
  { href: '/courses', key: 'courses' },
  { href: '/store',   key: 'store'   },
  { href: '/pricing', key: 'pricing' },
] as const

interface NavbarProps { locale: string }

export async function Navbar({ locale }: NavbarProps) {
  const session = await getServerSession(authOptions)
  const t       = await getTranslations({ locale, namespace: 'common.nav' })

  const isAuthenticated = !!session?.user
  const isAdmin         = session?.user?.role === 'ADMIN'
  const unreadCount     = session?.user?.id
    ? await getUnreadCount(session.user.id).catch(() => 0)
    : 0

  return (
    <motion.header
      className="sticky top-0 z-40 w-full"
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Glass backdrop bar */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-b border-stone-200/60" aria-hidden />

      <nav
        className="container-brand relative flex h-16 items-center justify-between gap-4"
        aria-label={locale === 'ar' ? 'القائمة الرئيسية' : 'Main navigation'}
      >
        {/* ── Brand ── */}
        <Link
          href="/"
          className="shrink-0 flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label="ALMANAR — Home"
        >
          {/* Gold accent dot */}
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold text-white font-bold text-sm">
            {locale === 'ar' ? 'م' : 'A'}
          </span>
          <span className="text-lg font-bold tracking-tight text-stone-900">
            {locale === 'ar' ? 'المنار' : 'ALMANAR'}
          </span>
        </Link>

        {/* ── Desktop nav links ── */}
        <ul className="hidden lg:flex items-center gap-0.5" role="list">
          {NAV_LINKS.map(({ href, key }) => (
            <li key={key}>
              <Link
                href={href}
                className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors duration-150"
              >
                {t(key)}
              </Link>
            </li>
          ))}
        </ul>

        {/* ── Right cluster ── */}
        <div className="hidden lg:flex items-center gap-2">
          <SearchBar locale={locale} />
          <LanguageSwitcher />

          {isAuthenticated ? (
            <>
              <NotificationBell initialUnread={unreadCount} locale={locale} />
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition-colors"
                >
                  {t('admin')}
                </Link>
              )}
              <Link
                href="/dashboard"
                className="rounded-lg px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
              >
                {t('dashboard')}
              </Link>
              <a
                href="/api/auth/signout"
                className="rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition-colors"
              >
                {t('signout')}
              </a>
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="rounded-lg px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
              >
                {t('signin')}
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-stone-900 px-5 py-2 text-sm font-semibold text-white hover:bg-stone-800 transition-colors shadow-brand-sm"
              >
                {t('signup')}
              </Link>
            </>
          )}
        </div>

        {/* ── Mobile menu ── */}
        <NavbarMobileMenu
          locale={locale}
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
        />
      </nav>
    </motion.header>
  )
}
