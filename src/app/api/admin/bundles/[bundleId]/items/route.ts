/**
 * POST   /api/admin/bundles/[bundleId]/items   — add a product to the bundle
 * DELETE /api/admin/bundles/[bundleId]/items   — remove a product from the bundle
 *
 * POST body:   { productId: string }
 * DELETE body: { productId: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession }       from '@/lib/adminGuard'
import { db }                        from '@/lib/db'

interface Params { params: Promise<{ bundleId: string }> }

// ─── POST — add item ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { bundleId } = await params
  const body = await req.json().catch(() => ({})) as { productId?: string }

  if (!body.productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  // Verify bundle + product exist
  const [bundle, product] = await Promise.all([
    db.bundle.findUnique({ where: { id: bundleId }, select: { id: true } }),
    db.product.findUnique({ where: { id: body.productId }, select: { id: true } }),
  ])
  if (!bundle)  return NextResponse.json({ error: 'Bundle not found' },  { status: 404 })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  // Upsert — idempotent if already added
  const item = await db.bundleItem.upsert({
    where:  { bundleId_productId: { bundleId, productId: body.productId } },
    create: { bundleId, productId: body.productId },
    update: {},
    select: { id: true, bundleId: true, productId: true },
  })

  return NextResponse.json({ item }, { status: 201 })
}

// ─── DELETE — remove item ─────────────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { bundleId } = await params
  const body = await req.json().catch(() => ({})) as { productId?: string }

  if (!body.productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  await db.bundleItem.deleteMany({
    where: { bundleId, productId: body.productId },
  }).catch(() => { /* non-fatal */ })

  return NextResponse.json({ ok: true })
}
