/**
 * GET    /api/admin/plans/[planId] — fetch a plan
 * PATCH  /api/admin/plans/[planId] — update fields
 * DELETE /api/admin/plans/[planId] — soft-delete (set isActive=false) or hard delete
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession }       from '@/lib/adminGuard'
import { db }                        from '@/lib/db'

interface Params { params: Promise<{ planId: string }> }

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { planId } = await params

  const plan = await db.membershipPlan.findUnique({
    where: { id: planId },
    include: {
      _count: { select: { subscriptions: true } },
    },
  }).catch(() => null)

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  return NextResponse.json({ plan })
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { planId } = await params

  const body = await req.json().catch(() => ({})) as {
    nameEn?:               string
    nameAr?:               string
    descriptionEn?:        string | null
    descriptionAr?:        string | null
    featuresEn?:           string[]
    featuresAr?:           string[]
    monthlyPrice?:         string | number
    annualPrice?:          string | number
    stripePriceIdMonthly?: string
    stripePriceIdAnnual?:  string
    isActive?:             boolean
  }

  const data: Record<string, unknown> = {}
  if (body.nameEn               !== undefined) data.nameEn               = body.nameEn.trim()
  if (body.nameAr               !== undefined) data.nameAr               = body.nameAr.trim()
  if (body.descriptionEn        !== undefined) data.descriptionEn        = body.descriptionEn?.trim() || null
  if (body.descriptionAr        !== undefined) data.descriptionAr        = body.descriptionAr?.trim() || null
  if (body.featuresEn           !== undefined) data.featuresEn           = body.featuresEn.filter(Boolean)
  if (body.featuresAr           !== undefined) data.featuresAr           = body.featuresAr.filter(Boolean)
  if (body.monthlyPrice         !== undefined) data.monthlyPrice         = Number(body.monthlyPrice)
  if (body.annualPrice          !== undefined) data.annualPrice          = Number(body.annualPrice)
  if (body.stripePriceIdMonthly !== undefined) data.stripePriceIdMonthly = body.stripePriceIdMonthly.trim()
  if (body.stripePriceIdAnnual  !== undefined) data.stripePriceIdAnnual  = body.stripePriceIdAnnual.trim()
  if (body.isActive             !== undefined) data.isActive             = body.isActive

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const plan = await db.membershipPlan.update({
    where:  { id: planId },
    data,
    select: { id: true, isActive: true, nameEn: true },
  }).catch(() => null)

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  return NextResponse.json({ plan })
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { planId } = await params

  // Soft-delete: deactivate rather than hard-delete (preserves subscription history)
  await db.membershipPlan.update({
    where: { id: planId },
    data:  { isActive: false },
  }).catch(() => null)

  return NextResponse.json({ ok: true })
}
