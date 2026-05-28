/**
 * PATCH  /api/admin/reviews/[reviewId] — approve or reject a review
 *   body: { status: 'APPROVED' | 'REJECTED' }
 * DELETE /api/admin/reviews/[reviewId] — hard delete
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession }       from '@/lib/adminGuard'
import { db }                        from '@/lib/db'
import { createNotification }        from '@/lib/notifications'
import type { ReviewStatus }         from '@prisma/client'

interface Params { params: Promise<{ reviewId: string }> }

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { reviewId } = await params
  const body = await req.json().catch(() => ({})) as { status?: ReviewStatus }

  if (!body.status || !['APPROVED', 'REJECTED'].includes(body.status)) {
    return NextResponse.json(
      { error: 'status must be APPROVED or REJECTED' },
      { status: 400 },
    )
  }

  const review = await db.review.update({
    where:  { id: reviewId },
    data:   { status: body.status },
    select: { id: true, status: true, userId: true },
  }).catch(() => null)

  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

  // Notify the reviewer
  const isApproved = body.status === 'APPROVED'
  void createNotification({
    userId:  review.userId,
    type:    isApproved ? 'REVIEW_APPROVED' : 'REVIEW_REJECTED',
    titleEn: isApproved ? 'Your review was approved' : 'Your review was not approved',
    titleAr: isApproved ? 'تمت الموافقة على تقييمك' : 'لم تتم الموافقة على تقييمك',
    bodyEn:  isApproved
      ? 'Your review is now visible on the platform.'
      : 'Your review did not meet our content guidelines.',
    bodyAr: isApproved
      ? 'أصبح تقييمك مرئياً على المنصة.'
      : 'لم يستوفِ تقييمك معايير المحتوى لدينا.',
  })

  return NextResponse.json({ review })
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { reviewId } = await params

  await db.review.delete({ where: { id: reviewId } }).catch(() => null)

  return NextResponse.json({ ok: true })
}
