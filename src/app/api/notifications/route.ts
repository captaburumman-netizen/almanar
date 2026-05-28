/**
 * GET  /api/notifications?limit=20&offset=0
 *   → { items, total, unreadCount }
 *
 * POST /api/notifications/read-all  (handled in read-all/route.ts)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession }          from 'next-auth'
import { authOptions }               from '@/lib/auth'
import { listNotifications, getUnreadCount } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const sp     = new URL(req.url).searchParams
  const limit  = Math.min(Number(sp.get('limit')  ?? 20), 50)
  const offset = Math.max(Number(sp.get('offset') ?? 0),  0)

  const [{ items, total }, unreadCount] = await Promise.all([
    listNotifications(userId, limit, offset),
    getUnreadCount(userId),
  ])

  return NextResponse.json({ items, total, unreadCount })
}
