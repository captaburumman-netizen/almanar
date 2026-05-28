/**
 * GET  /api/admin/products — list all products
 * POST /api/admin/products — create a product
 */
import { NextRequest, NextResponse }      from 'next/server'
import { requireAdminSession }            from '@/lib/adminGuard'
import { db }                             from '@/lib/db'
import { slugify }                        from '@/lib/utils'
import type { ProductCategory, ProductLanguage } from '@prisma/client'

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const { error } = await requireAdminSession()
  if (error) return error

  const products = await db.product.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    select: {
      id:          true,
      slug:        true,
      titleEn:     true,
      titleAr:     true,
      price:       true,
      isFree:      true,
      category:    true,
      language:    true,
      isPublished: true,
      coverImage:  true,
    },
  })

  return NextResponse.json({ products })
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
    category?:      ProductCategory
    language?:      ProductLanguage
    coverImage?:    string
    s3Key?:         string
    affiliateUrl?:  string
    sortOrder?:     number
    slug?:          string
  }

  const {
    titleEn      = '',
    titleAr      = '',
    descriptionEn = '',
    descriptionAr = '',
    price         = 0,
    category      = 'EBOOK',
    language      = 'BILINGUAL',
    coverImage,
    s3Key,
    affiliateUrl,
    sortOrder     = 0,
    slug:          rawSlug,
  } = body

  if (!titleEn.trim() || !titleAr.trim()) {
    return NextResponse.json({ error: 'titleEn and titleAr are required' }, { status: 400 })
  }
  if (!descriptionEn.trim() || !descriptionAr.trim()) {
    return NextResponse.json({ error: 'descriptionEn and descriptionAr are required' }, { status: 400 })
  }

  const numPrice = Number(price)
  const isFree   = numPrice === 0

  const slug = rawSlug?.trim() || slugify(titleEn) || `product-${Date.now()}`

  const existing = await db.product.findUnique({ where: { slug }, select: { id: true } })
  if (existing) {
    return NextResponse.json({ error: `Slug "${slug}" is already in use` }, { status: 409 })
  }

  const product = await db.product.create({
    data: {
      slug,
      titleEn:      titleEn.trim(),
      titleAr:      titleAr.trim(),
      descriptionEn: descriptionEn.trim(),
      descriptionAr: descriptionAr.trim(),
      price:        numPrice,
      isFree,
      category,
      language,
      coverImage:   coverImage?.trim() || null,
      s3Key:        s3Key?.trim() || null,
      affiliateUrl: affiliateUrl?.trim() || null,
      sortOrder,
    },
    select: { id: true, slug: true },
  })

  return NextResponse.json({ product }, { status: 201 })
}
