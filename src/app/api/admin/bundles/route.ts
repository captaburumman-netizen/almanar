/**
 * GET  /api/admin/bundles — list all bundles
 * POST /api/admin/bundles — create a new bundle
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession }       from '@/lib/adminGuard'
import { db }                        from '@/lib/db'
import { slugify }                   from '@/lib/utils'

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const { error } = await requireAdminSession()
  if (error) return error

  const bundles = await db.bundle.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id:          true,
      slug:        true,
      titleEn:     true,
      titleAr:     true,
      price:       true,
      isPublished: true,
      coverImage:  true,
      _count: { select: { items: true } },
    },
  }).catch(() => [])

  return NextResponse.json({ bundles })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { error } = await requireAdminSession()
  if (error) return error

  const body = await req.json().catch(() => ({})) as {
    titleEn?:       string
    titleAr?:       string
    descriptionEn?: string
    descriptionAr?: string
    price?:         string | number
    coverImage?:    string
    slug?:          string
  }

  const {
    titleEn       = '',
    titleAr       = '',
    descriptionEn = '',
    descriptionAr = '',
    price         = 0,
    coverImage,
    slug: rawSlug,
  } = body

  if (!titleEn.trim() || !titleAr.trim()) {
    return NextResponse.json({ error: 'titleEn and titleAr are required' }, { status: 400 })
  }
  if (!descriptionEn.trim() || !descriptionAr.trim()) {
    return NextResponse.json({ error: 'descriptionEn and descriptionAr are required' }, { status: 400 })
  }

  const numPrice = Number(price)
  if (isNaN(numPrice) || numPrice < 0) {
    return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 })
  }

  const slug = (rawSlug?.trim() || slugify(titleEn)) || `bundle-${Date.now()}`

  const existing = await db.bundle.findUnique({ where: { slug }, select: { id: true } })
  if (existing) {
    return NextResponse.json({ error: `Slug "${slug}" is already in use` }, { status: 409 })
  }

  const bundle = await db.bundle.create({
    data: {
      slug,
      titleEn:       titleEn.trim(),
      titleAr:       titleAr.trim(),
      descriptionEn: descriptionEn.trim(),
      descriptionAr: descriptionAr.trim(),
      price:         numPrice,
      coverImage:    coverImage?.trim() || null,
    },
    select: { id: true, slug: true },
  })

  return NextResponse.json({ bundle }, { status: 201 })
}
