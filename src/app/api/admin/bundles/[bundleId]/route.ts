/**
 * GET    /api/admin/bundles/[bundleId] — fetch bundle with items
 * PATCH  /api/admin/bundles/[bundleId] — update fields
 * DELETE /api/admin/bundles/[bundleId] — delete bundle
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession }       from '@/lib/adminGuard'
import { db }                        from '@/lib/db'

interface Params { params: Promise<{ bundleId: string }> }

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { bundleId } = await params

  const bundle = await db.bundle.findUnique({
    where:  { id: bundleId },
    include: {
      items: {
        select: {
          id:      true,
          product: {
            select: { id: true, titleEn: true, titleAr: true, coverImage: true, price: true },
          },
        },
      },
    },
  })

  if (!bundle) return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })

  return NextResponse.json({ bundle })
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { bundleId } = await params

  const body = await req.json().catch(() => ({})) as {
    titleEn?:       string
    titleAr?:       string
    descriptionEn?: string
    descriptionAr?: string
    price?:         string | number
    coverImage?:    string | null
    isPublished?:   boolean
  }

  const data: Record<string, unknown> = {}
  if (body.titleEn       !== undefined) data.titleEn       = body.titleEn.trim()
  if (body.titleAr       !== undefined) data.titleAr       = body.titleAr.trim()
  if (body.descriptionEn !== undefined) data.descriptionEn = body.descriptionEn.trim()
  if (body.descriptionAr !== undefined) data.descriptionAr = body.descriptionAr.trim()
  if (body.price         !== undefined) data.price         = Number(body.price)
  if (body.coverImage    !== undefined) data.coverImage    = body.coverImage?.trim() || null
  if (body.isPublished   !== undefined) data.isPublished   = body.isPublished

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const bundle = await db.bundle.update({
    where:  { id: bundleId },
    data,
    select: { id: true, slug: true, isPublished: true },
  }).catch(() => null)

  if (!bundle) return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })

  return NextResponse.json({ bundle })
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { bundleId } = await params
  await db.bundle.delete({ where: { id: bundleId } }).catch(() => null)

  return NextResponse.json({ ok: true })
}
