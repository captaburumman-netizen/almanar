/**
 * Auth layout — full-page centered wrapper for all /{locale}/auth/* pages.
 *
 * Uses a warm gradient background matching the ALMANAR design language.
 * Redirects already-authenticated users to their dashboard.
 */
import { redirectIfAuthed } from '@/lib/session'
import type { Locale } from '@/i18n/routing'

interface AuthLayoutProps {
  children: React.ReactNode
  params:   Promise<{ locale: string }>
}

export default async function AuthLayout({ children, params }: AuthLayoutProps) {
  const { locale } = await params

  // Redirect if already signed in
  await redirectIfAuthed(locale as Locale)

  return (
    <main className="min-h-screen gradient-warm flex items-center justify-center px-4 py-16">
      {children}
    </main>
  )
}
