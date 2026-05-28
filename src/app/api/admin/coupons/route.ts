/**
 * GET  /api/admin/coupons — list coupons (with usage stats)
 * POST /api/admin/coupons — create a coupon
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession }       from '@/lib/adminGuard'
import { db }                        from '@/lib/db'

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const { error } = await requireAdminSession()
  if (error) return error

  const coupons = await db.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id:            true,
      code:          true,
      discountType:  true,
      discountValue: true,
      courseId:      true,
      productId:     true,
      bundleId:      true,
      usageLimit:    true,
      usageCount:    true,
      validFrom:     true,
      validUntil:    true,
      isActive:      true,
      createdAt:     true,
      _count: { select: { redemptions: true } },
    },
  }).catch(() => [])

  return NextResponse.json({ coupons })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { error } = await requireAdminSession()
  if (error) return error

  const body = await req.json().catch(() => ({})) as {
    code?:          string
    discountType?:  'PERCENT' | 'FIXED_AMOUNT'
    discountValue?: string | number
    courseId?:      string
    productId?:     string
    bundleId?:      string
    usageLimit?:    string | number | null
    validFrom?:     string
    validUntil?:    string | null
    isActive?:      boolean
  }

  const {
    code          = '',
    discountType,
    discountValue = 0,
    courseId,
    productId,
    bundleId,
    usageLimit,
    validFrom,
    validUntil,
    isActive      = true,
  } = body

  const upperCode = code.trim().toUpperCase()
  if (!upperCode) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
  }
  if (!['PERCENT', 'FIXED_AMOUNT'].includes(discountType ?? '')) {
    return NextResponse.json({ error: 'discountType must be PERCENT or FIXED_AMOUNT' }, { status: 400 })
  }

  const dv = Number(discountValue)
  if (isNaN(dv) || dv <= 0) {
    return NextResponse.json({ error: 'discountValue must be positive' }, { status: 400 })
  }
  if (discountType === 'PERCENT' && dv > 100) {
    return NextResponse.json({ error: 'Percent discount cannot exceed 100' }, { status: 400 })
  }

  // Check uniqueness
  const existing = await db.coupon.findUnique({ where: { code: upperCode }, select: { id: true } }).catch(() => null)
  if (existing) {
    return NextResponse.json({ error: `Coupon code "${upperCode}" already exists` }, { status: 409 })
  }

  const usageLimitNum = usageLimit !== undefined && usageLimit !== null ? Number(usageLimit) : null

  const coupon = await db.coupon.create({
    data: {
      code:          upperCode,
      discountType:  discountType!,
      discountValue: dv,
      courseId:      courseId?.trim()  || null,
      productId:     productId?.trim() || null,
      bundleId:      bundleId?.trim()  || null,
      usageLimit:    usageLimitNum,
      validFrom:     validFrom ? new Date(validFrom) : new Date(),
      validUntil:    validUntil ? new Date(validUntil) : null,
      isActive,
    },
    select: { id: true, code: true },
  })

  return NextResponse.json({ coupon }, { status: 201 })
}
