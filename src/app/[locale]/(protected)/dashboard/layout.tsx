/**
 * Dashboard shell layout.
 *
 * Wraps /[locale]/dashboard and /[locale]/dashboard/account.
 * Renders: sticky top bar with logo, nav tabs, user name, sign-out button.
 * The (protected) parent layout already enforces auth.
 */
import type { ReactNode }   from 'react'
import { getServerSession } from 'next-auth'
import { Link }             from '@/i18n/navigation'
import { authOptions }      from '@/lib/auth'
import { SignOutButton }    from '@/components/dashboard/SignOutButton'
import type { Locale }      from '@/i18n/routing'

interface DashboardLayoutProps {
  children: ReactNode
  params:   Promise<{ locale: Locale }>
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { locale } = await params
  const isAr       = locale === 'ar'
  const session    = await getServerSession(authOptions)
  const userName   = session?.user?.name ?? session?.user?.email ?? ''

  return (
    <div className="min-h-screen bg-muted/20">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container-brand flex h-14 items-center gap-6">
          {/* Brand mark */}
          <Link
            href="/"
            className="shrink-0 text-base font-bold text-warm-brown tracking-tight"
          >
            ALMANAR
          </Link>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1 text-sm" aria-label={isAr ? 'التنقل في اللوحة' : 'Dashboard navigation'}>
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {isAr ? 'لوحتي' : 'Dashboard'}
            </Link>
            <Link
              href="/dashboard/account"
              className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {isAr ? 'الحساب' : 'Account'}
            </Link>
          </nav>

          {/* Right: user name + sign out */}
          <div className="ms-auto flex items-center gap-3">
            {userName && (
              <span className="hidden sm:block text-sm text-muted-foreground truncate max-w-[160px]">
                {userName}
              </span>
            )}
            <SignOutButton
              locale={locale}
              label={isAr ? 'تسجيل الخروج' : 'Sign Out'}
            />
          </div>
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <main className="container-brand py-8 space-y-10">
        {children}
      </main>
    </div>
  )
}
