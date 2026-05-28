/**
 * GET  /api/admin/plans — list all membership plans
 * POST /api/admin/plans — create a new plan
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession }       from '@/lib/adminGuard'
import { db }                        from '@/lib/db'

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const { error } = await requireAdminSession()
  if (error) return error

  const plans = await db.membershipPlan.findMany({
    orderBy: { monthlyPrice: 'asc' },
    select: {
      id:                   true,
      nameEn:               true,
      nameAr:               true,
      monthlyPrice:         true,
      annualPrice:          true,
      stripePriceIdMonthly: true,
      stripePriceIdAnnual:  true,
      isActive:             true,
      _count: { select: { subscriptions: true } },
    },
  }).catch(() => [])

  return NextResponse.json({ plans })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { error } = await requireAdminSession()
  if (error) return error

  const body = await req.json().catch(() => ({})) as {
    nameEn?:               string
    nameAr?:               string
    descriptionEn?:        string
    descriptionAr?:        string
    featuresEn?:           string[]
    featuresAr?:           string[]
    monthlyPrice?:         string | number
    annualPrice?:          string | number
    stripePriceIdMonthly?: string
    stripePriceIdAnnual?:  string
  }

  const {
    nameEn               = '',
    nameAr               = '',
    descriptionEn        = '',
    descriptionAr        = '',
    featuresEn           = [],
    featuresAr           = [],
    monthlyPrice         = 0,
    annualPrice          = 0,
    stripePriceIdMonthly = '',
    stripePriceIdAnnual  = '',
  } = body

  if (!nameEn.trim() || !nameAr.trim()) {
    return NextResponse.json({ error: 'nameEn and nameAr are required' }, { status: 400 })
  }
  if (!stripePriceIdMonthly.trim() || !stripePriceIdAnnual.trim()) {
    return NextResponse.json(
      { error: 'stripePriceIdMonthly and stripePriceIdAnnual are required' },
      { status: 400 },
    )
  }

  const monthly = Number(monthlyPrice)
  const annual  = Number(annualPrice)
  if (isNaN(monthly) || monthly < 0 || isNaN(annual) || annual < 0) {
    return NextResponse.json({ error: 'prices must be non-negative numbers' }, { status: 400 })
  }

  // Check for duplicate Stripe price IDs
  const existing = await db.membershipPlan.findFirst({
    where: {
      OR: [
        { stripePriceIdMonthly: stripePriceIdMonthly.trim() },
        { stripePriceIdAnnual:  stripePriceIdAnnual.trim()  },
      ],
    },
    select: { id: true },
  }).catch(() => null)

  if (existing) {
    return NextResponse.json({ error: 'Stripe price ID already in use' }, { status: 409 })
  }

  const plan = await db.membershipPlan.create({
    data: {
      nameEn:               nameEn.trim(),
      nameAr:               nameAr.trim(),
      descriptionEn:        descriptionEn.trim() || null,
      descriptionAr:        descriptionAr.trim() || null,
      featuresEn:           featuresEn.filter(Boolean),
      featuresAr:           featuresAr.filter(Boolean),
      monthlyPrice:         monthly,
      annualPrice:          annual,
      stripePriceIdMonthly: stripePriceIdMonthly.trim(),
      stripePriceIdAnnual:  stripePriceIdAnnual.trim(),
    },
    select: { id: true },
  })

  return NextResponse.json({ plan }, { status: 201 })
}
