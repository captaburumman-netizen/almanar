/**
 * POST /api/user/password
 *
 * Changes the authenticated user's password.
 * Requires the current password to be correct (guards against session hijacking).
 * Only available for credential (email/password) accounts — OAuth users have no password.
 *
 * Body: { currentPassword: string; newPassword: string }
 * Returns: { ok: true }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession }          from 'next-auth'
import bcrypt                        from 'bcryptjs'
import { authOptions }               from '@/lib/auth'
import { db }                        from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as {
    currentPassword?: string
    newPassword?:     string
  }
  const { currentPassword = '', newPassword = '' } = body

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: 'Both currentPassword and newPassword are required' },
      { status: 400 }
    )
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters' },
      { status: 422 }
    )
  }

  // Load user's stored password hash
  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { password: true },
  })

  if (!user?.password) {
    // OAuth account — no password to change
    return NextResponse.json(
      { error: 'Password management is not available for social login accounts' },
      { status: 400 }
    )
  }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) {
    return NextResponse.json(
      { error: 'Current password is incorrect' },
      { status: 401 }
    )
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await db.user.update({
    where: { id: session.user.id },
    data:  { password: hashed },
  })

  return NextResponse.json({ ok: true })
}
