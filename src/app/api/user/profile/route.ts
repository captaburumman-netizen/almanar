/**
 * PATCH /api/user/profile
 *
 * Updates the authenticated user's display name.
 * Body: { name: string }
 * Returns: { name: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession }          from 'next-auth'
import { authOptions }               from '@/lib/auth'
import { db }                        from '@/lib/db'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { name?: string }
  const name = body.name?.trim() ?? ''

  if (name.length < 2 || name.length > 60) {
    return NextResponse.json(
      { error: 'Name must be between 2 and 60 characters' },
      { status: 422 }
    )
  }

  const updated = await db.user.update({
    where:  { id: session.user.id },
    data:   { name },
    select: { name: true },
  })

  return NextResponse.json({ name: updated.name })
}
