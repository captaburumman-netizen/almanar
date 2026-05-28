/**
 * Wishlist API — /api/wishlist
 *
 * GET    → Returns the authenticated user's wishlisted courses and products.
 * POST   → Adds a course or product to the wishlist (idempotent).
 * DELETE → Removes a course or product from the wishlist.
 *
 * Body (POST / DELETE): { courseId: string } | { productId: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession }          from 'next-auth'
import { authOptions }               from '@/lib/auth'
import { db }                        from '@/lib/db'

// ─── GET — fetch my wishlist ──────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const items = await db.wishlist.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id:       true,
      courseId: true,
      productId: true,
      createdAt: true,
      course: {
        select: {
          id: true, slug: true,
          titleEn: true, titleAr: true,
          shortDescEn: true, shortDescAr: true,
          thumbnail: true, price: true, isMemberOnly: true,
        },
      },
      product: {
        select: {
          id: true, slug: true,
          titleEn: true, titleAr: true,
          coverImage: true, price: true, isFree: true,
        },
      },
    },
  })

  return NextResponse.json({ items })
}

// ─── POST — add to wishlist ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json().catch(() => ({})) as {
    courseId?:  string
    productId?: string
  }

  const { courseId, productId } = body

  if (!courseId && !productId) {
    return NextResponse.json(
      { error: 'courseId or productId is required' },
      { status: 400 },
    )
  }
  if (courseId && productId) {
    return NextResponse.json(
      { error: 'Provide either courseId or productId, not both' },
      { status: 400 },
    )
  }

  // Upsert — idempotent (already wishlisted = no-op, returns existing row)
  const entry = courseId
    ? await db.wishlist.upsert({
        where:  { userId_courseId:  { userId, courseId } },
        create: { userId, courseId },
        update: {},
      })
    : await db.wishlist.upsert({
        where:  { userId_productId: { userId, productId: productId! } },
        create: { userId, productId },
        update: {},
      })

  return NextResponse.json(entry, { status: 201 })
}

// ─── DELETE — remove from wishlist ────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json().catch(() => ({})) as {
    courseId?:  string
    productId?: string
  }

  const { courseId, productId } = body

  if (!courseId && !productId) {
    return NextResponse.json(
      { error: 'courseId or productId is required' },
      { status: 400 },
    )
  }

  if (courseId) {
    await db.wishlist.deleteMany({ where: { userId, courseId } })
  } else {
    await db.wishlist.deleteMany({ where: { userId, productId } })
  }

  return NextResponse.json({ ok: true })
}
