/**
 * POST /api/notifications/read-all
 *   Marks every unread notification for the current user as read.
 *   Returns { count } — the number of rows updated.
 */
import { NextResponse }  from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions }   from '@/lib/auth'
import { markAllRead }   from '@/lib/notifications'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await markAllRead(session.user.id)
  return NextResponse.json({ count: result.count })
}
