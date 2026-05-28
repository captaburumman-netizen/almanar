/**
 * GET    /api/admin/products/[productId] — fetch single product
 * PATCH  /api/admin/products/[productId] — update product fields
 * DELETE /api/admin/products/[productId] — delete product
 */
import { NextRequest, NextResponse }      from 'next/server'
import { requireAdminSession }            from '@/lib/adminGuard'
import { db }                             from '@/lib/db'
import type { ProductCategory, ProductLanguage } from '@prisma/client'

interface Params {
  params: Promise<{ productId: string }>
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { productId } = await params

  const product = await db.product.findUnique({ where: { id: productId } })

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json({ product })
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { productId } = await params

  const body = await req.json().catch(() => ({})) as {
    titleEn?:       string
    titleAr?:       string
    descriptionEn?: string
    descriptionAr?: string
    price?:         string | number
    category?:      ProductCategory
    language?:      ProductLanguage
    coverImage?:    string | null
    s3Key?:         string | null
    affiliateUrl?:  string | null
    sortOrder?:     number
    isPublished?:   boolean
  }

  const data: Record<string, unknown> = {}
  if (body.titleEn       !== undefined) data.titleEn       = body.titleEn.trim()
  if (body.titleAr       !== undefined) data.titleAr       = body.titleAr.trim()
  if (body.descriptionEn !== undefined) data.descriptionEn = body.descriptionEn.trim()
  if (body.descriptionAr !== undefined) data.descriptionAr = body.descriptionAr.trim()
  if (body.category      !== undefined) data.category      = body.category
  if (body.language      !== undefined) data.language      = body.language
  if (body.coverImage    !== undefined) data.coverImage    = body.coverImage?.trim() || null
  if (body.s3Key         !== undefined) data.s3Key         = body.s3Key?.trim() || null
  if (body.affiliateUrl  !== undefined) data.affiliateUrl  = body.affiliateUrl?.trim() || null
  if (body.sortOrder     !== undefined) data.sortOrder     = Number(body.sortOrder)
  if (body.isPublished   !== undefined) data.isPublished   = body.isPublished
  if (body.price !== undefined) {
    const numPrice = Number(body.price)
    data.price  = numPrice
    data.isFree = numPrice === 0
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const product = await db.product.update({
    where: { id: productId },
    data,
    select: { id: true, slug: true, isPublished: true },
  }).catch(() => null)

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json({ product })
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { productId } = await params

  await db.product.delete({ where: { id: productId } }).catch(() => null)

  return NextResponse.json({ ok: true })
}
