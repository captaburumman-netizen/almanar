/**
 * POST /api/coupons/validate
 *
 * Body: { code, originalPrice, courseId?, productId?, bundleId? }
 * Returns discount details or an error.
 * Auth required — prevents brute-force probing of coupon codes.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession }          from 'next-auth'
import { authOptions }               from '@/lib/auth'
import { validateCoupon }            from '@/lib/coupons'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as {
    code?:          string
    originalPrice?: number
    courseId?:      string
    productId?:     string
    bundleId?:      string
  }

  const { code = '', originalPrice = 0, courseId, productId, bundleId } = body

  if (!code.trim()) {
    return NextResponse.json({ valid: false, error: 'Coupon code is required' })
  }
  if (typeof originalPrice !== 'number' || originalPrice <= 0) {
    return NextResponse.json({ valid: false, error: 'originalPrice must be a positive number' })
  }

  const result = await validateCoupon(code, { originalPrice, courseId, productId, bundleId })
  return NextResponse.json(result)
}
