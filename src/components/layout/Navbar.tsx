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
      <div className="absolute inset-0 bg-[#010f23]/90 backdrop-blur-xl border-b border-[#252b37]" aria-hidden />

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
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet text-white font-bold text-sm">
            {locale === 'ar' ? 'م' : 'A'}
          </span>
          <span className="text-lg font-bold tracking-tight text-white">
            {locale === 'ar' ? 'المنار' : 'ALMANAR'}
          </span>
        </Link>

        {/* ── Desktop nav links ── */}
        <ul className="hidden lg:flex items-center gap-0.5" role="list">
          {NAV_LINKS.map(({ href, key }) => (
            <li key={key}>
              <Link
                href={href}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors duration-150"
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
                  className="rounded-lg px-3 py-2 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {t('admin')}
                </Link>
              )}
              <Link
                href="/dashboard"
                className="rounded-lg px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors"
              >
                {t('dashboard')}
              </Link>
              <a
                href="/api/auth/signout"
                className="rounded-lg px-3 py-2 text-sm text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              >
                {t('signout')}
              </a>
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="rounded-lg px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors"
              >
                {t('signin')}
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-full bg-violet px-5 py-2 text-sm font-semibold text-white hover:bg-violet-dark transition-colors shadow-violet"
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
