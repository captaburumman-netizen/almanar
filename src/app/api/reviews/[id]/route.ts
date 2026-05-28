/**
 * DELETE /api/reviews/[id] — user removes their own review
 *
 * Auth required. Returns 404 if review doesn't belong to user.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession }          from 'next-auth'
import { authOptions }               from '@/lib/auth'
import { deleteUserReview }          from '@/lib/reviews'

interface Params { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const result  = await deleteUserReview(id, session.user.id)

  if (result.count === 0) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
