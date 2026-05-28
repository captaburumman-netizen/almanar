/**
 * GET    /api/admin/coupons/[couponId] — fetch a coupon with redemptions
 * PATCH  /api/admin/coupons/[couponId] — update fields
 * DELETE /api/admin/coupons/[couponId] — hard delete
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession }       from '@/lib/adminGuard'
import { db }                        from '@/lib/db'

interface Params { params: Promise<{ couponId: string }> }

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { couponId } = await params

  const coupon = await db.coupon.findUnique({
    where: { id: couponId },
    include: {
      _count: { select: { redemptions: true } },
    },
  }).catch(() => null)

  if (!coupon) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })

  return NextResponse.json({ coupon })
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { couponId } = await params

  const body = await req.json().catch(() => ({})) as {
    discountType?:  'PERCENT' | 'FIXED_AMOUNT'
    discountValue?: string | number
    usageLimit?:    string | number | null
    validUntil?:    string | null
    isActive?:      boolean
    courseId?:      string | null
    productId?:     string | null
    bundleId?:      string | null
  }

  const data: Record<string, unknown> = {}
  if (body.discountType  !== undefined) data.discountType  = body.discountType
  if (body.discountValue !== undefined) data.discountValue = Number(body.discountValue)
  if (body.isActive      !== undefined) data.isActive      = body.isActive
  if (body.courseId      !== undefined) data.courseId      = body.courseId?.trim() || null
  if (body.productId     !== undefined) data.productId     = body.productId?.trim() || null
  if (body.bundleId      !== undefined) data.bundleId      = body.bundleId?.trim() || null
  if ('usageLimit'  in body) {
    data.usageLimit = body.usageLimit !== null && body.usageLimit !== undefined
      ? Number(body.usageLimit)
      : null
  }
  if ('validUntil' in body) {
    data.validUntil = body.validUntil ? new Date(body.validUntil) : null
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const coupon = await db.coupon.update({
    where:  { id: couponId },
    data,
    select: { id: true, code: true, isActive: true },
  }).catch(() => null)

  if (!coupon) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })

  return NextResponse.json({ coupon })
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { couponId } = await params

  await db.coupon.delete({ where: { id: couponId } }).catch(() => null)

  return NextResponse.json({ ok: true })
}
