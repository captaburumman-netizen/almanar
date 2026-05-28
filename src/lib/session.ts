/**
 * Server-side session helpers.
 *
 * Use these in Server Components and Route Handlers to enforce auth gates.
 * Never call getServerSession() on the client — use useSession() instead.
 */
import { getServerSession } from 'next-auth'
import { redirect }          from 'next/navigation'
import { authOptions }       from '@/lib/auth'
import type { Session }      from 'next-auth'
import type { Locale }       from '@/i18n/routing'

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Return the current session or redirect to sign-in.
 * Use in dashboard / lesson / account layouts.
 */
export async function requireAuth(locale: Locale): Promise<Session> {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect(`/${locale}/auth/signin`)
  }
  return session
}

/**
 * Return the current session only if the user is ADMIN, otherwise redirect.
 */
export async function requireAdmin(locale: Locale): Promise<Session> {
  const session = await requireAuth(locale)
  if (session.user.role !== 'ADMIN') {
    redirect(`/${locale}/dashboard`)
  }
  return session
}

/**
 * Return the current session (may be null).
 * Use in public pages that render differently for authed users.
 */
export async function getOptionalSession(): Promise<Session | null> {
  return getServerSession(authOptions)
}

/**
 * If already authenticated, redirect to dashboard.
 * Use in sign-in / sign-up pages.
 */
export async function redirectIfAuthed(locale: Locale): Promise<void> {
  const session = await getServerSession(authOptions)
  if (session) {
    redirect(`/${locale}/dashboard`)
  }
}
