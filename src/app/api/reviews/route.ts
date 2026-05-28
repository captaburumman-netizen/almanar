/**
 * GET  /api/reviews?courseId=...   — list APPROVED reviews for a course
 * GET  /api/reviews?productId=...  — list APPROVED reviews for a product
 * POST /api/reviews                — submit a new review (auth required; must have purchased)
 *   body: { courseId?, productId?, rating: 1-5, comment? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession }          from 'next-auth'
import { authOptions }               from '@/lib/auth'
import { db }                        from '@/lib/db'

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const courseId  = searchParams.get('courseId')  ?? undefined
  const productId = searchParams.get('productId') ?? undefined

  if (!courseId && !productId) {
    return NextResponse.json({ error: 'courseId or productId is required' }, { status: 400 })
  }

  const reviews = await db.review.findMany({
    where: {
      status: 'APPROVED',
      ...(courseId  ? { courseId }  : {}),
      ...(productId ? { productId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id:        true,
      rating:    true,
      comment:   true,
      createdAt: true,
      user: { select: { name: true } },
    },
  }).catch(() => [])

  // Aggregate stats
  const total  = reviews.length
  const avgRating = total > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
    : null

  return NextResponse.json({ reviews, total, avgRating })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json().catch(() => ({})) as {
    courseId?:  string
    productId?: string
    rating?:    number
    comment?:   string
  }

  const { courseId, productId, rating, comment } = body

  // ── Validate scope ────────────────────────────────────────────────────────
  if (!courseId && !productId) {
    return NextResponse.json({ error: 'courseId or productId is required' }, { status: 400 })
  }
  if (courseId && productId) {
    return NextResponse.json({ error: 'Provide courseId OR productId, not both' }, { status: 400 })
  }

  // ── Validate rating ────────────────────────────────────────────────────────
  if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be an integer between 1 and 5' }, { status: 400 })
  }

  // ── Verify purchase / enrollment ───────────────────────────────────────────
  if (courseId) {
    const enrolled = await db.enrollment.findUnique({
      where:  { userId_courseId: { userId, courseId } },
      select: { id: true },
    }).catch(() => null)
    if (!enrolled) {
      return NextResponse.json({ error: 'You must be enrolled in this course to leave a review' }, { status: 403 })
    }
  } else if (productId) {
    const purchased = await db.productPurchase.findFirst({
      where:  { userId, productId, status: 'COMPLETED' },
      select: { id: true },
    }).catch(() => null)
    if (!purchased) {
      return NextResponse.json({ error: 'You must have purchased this product to leave a review' }, { status: 403 })
    }
  }

  // ── Upsert review ──────────────────────────────────────────────────────────
  // Users can update their own review; reset to PENDING for re-moderation.
  try {
    let review: { id: string }

    if (courseId) {
      const existing = await db.review.findUnique({
        where:  { userId_courseId: { userId, courseId } },
        select: { id: true },
      })
      if (existing) {
        review = await db.review.update({
          where: { id: existing.id },
          data:  { rating, comment: comment?.trim() || null, status: 'PENDING' },
          select: { id: true },
        })
      } else {
        review = await db.review.create({
          data:   { userId, courseId, rating, comment: comment?.trim() || null },
          select: { id: true },
        })
      }
    } else {
      const existing = await db.review.findUnique({
        where:  { userId_productId: { userId, productId: productId! } },
        select: { id: true },
      })
      if (existing) {
        review = await db.review.update({
          where: { id: existing.id },
          data:  { rating, comment: comment?.trim() || null, status: 'PENDING' },
          select: { id: true },
        })
      } else {
        review = await db.review.create({
          data:   { userId, productId, rating, comment: comment?.trim() || null },
          select: { id: true },
        })
      }
    }

    return NextResponse.json(
      { review, message: 'Review submitted and pending moderation' },
      { status: 201 },
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
