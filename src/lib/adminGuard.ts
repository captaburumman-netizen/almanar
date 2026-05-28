/**
 * Admin API guard helpers.
 *
 * Call `requireAdminSession()` at the top of every admin API route handler.
 * Returns the session on success, or a 401/403 NextResponse to return early.
 */
import { getServerSession } from 'next-auth'
import { NextResponse }     from 'next/server'
import { authOptions }      from '@/lib/auth'
import type { Session }     from 'next-auth'

type GuardResult =
  | { session: Session;  error: null }
  | { session: null;     error: NextResponse }

export async function requireAdminSession(): Promise<GuardResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return {
      session: null,
      error:   NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (session.user.role !== 'ADMIN') {
    return {
      session: null,
      error:   NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 }),
    }
  }

  return { session, error: null }
}
