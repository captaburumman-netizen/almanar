/**
 * Protected layout — requires authentication.
 *
 * Wraps all routes under /[locale]/(protected)/.
 * Unauthenticated visitors are redirected to sign-in via requireAuth().
 * No marketing Navbar/Footer — pages in this group render their own chrome.
 */
import type { ReactNode }  from 'react'
import { requireAuth }     from '@/lib/session'
import type { Locale }     from '@/i18n/routing'

interface ProtectedLayoutProps {
  children: ReactNode
  params:   Promise<{ locale: Locale }>
}

export default async function ProtectedLayout({
  children,
  params,
}: ProtectedLayoutProps) {
  const { locale } = await params
  await requireAuth(locale)   // redirects to /[locale]/auth/signin if not authed
  return <>{children}</>
}
