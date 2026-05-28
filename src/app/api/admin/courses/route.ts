/**
 * GET  /api/admin/courses — paginated list of all courses
 * POST /api/admin/courses — create a new course
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession }       from '@/lib/adminGuard'
import { db }                        from '@/lib/db'
import { slugify }                   from '@/lib/utils'
import type { Level }                from '@prisma/client'

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const { error } = await requireAdminSession()
  if (error) return error

  const courses = await db.course.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id:          true,
      slug:        true,
      titleEn:     true,
      titleAr:     true,
      price:       true,
      isPublished: true,
      isMemberOnly:true,
      level:       true,
      _count: {
        select: { lessons: { where: { isPublished: true } } },
      },
    },
  })

  return NextResponse.json({ courses })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { error } = await requireAdminSession()
  if (error) return error

  const body = await req.json().catch(() => ({})) as {
    titleEn?:      string
    titleAr?:      string
    descriptionEn?: string
    descriptionAr?: string
    shortDescEn?:  string
    shortDescAr?:  string
    price?:        string | number
    isMemberOnly?: boolean
    level?:        Level
    categoryEn?:   string
    categoryAr?:   string
    thumbnail?:    string
    previewVideoUrl?: string
    slug?:         string
  }

  const {
    titleEn     = '',
    titleAr     = '',
    descriptionEn = '',
    descriptionAr = '',
    shortDescEn = '',
    shortDescAr = '',
    price       = 0,
    isMemberOnly = false,
    level       = 'BEGINNER',
    categoryEn,
    categoryAr,
    thumbnail,
    previewVideoUrl,
    slug: rawSlug,
  } = body

  if (!titleEn.trim() || !titleAr.trim()) {
    return NextResponse.json({ error: 'titleEn and titleAr are required' }, { status: 400 })
  }
  if (!descriptionEn.trim() || !descriptionAr.trim()) {
    return NextResponse.json({ error: 'descriptionEn and descriptionAr are required' }, { status: 400 })
  }
  if (!shortDescEn.trim() || !shortDescAr.trim()) {
    return NextResponse.json({ error: 'shortDescEn and shortDescAr are required' }, { status: 400 })
  }

  const slug = (rawSlug?.trim() || slugify(titleEn)) || `course-${Date.now()}`

  // Check slug uniqueness
  const existing = await db.course.findUnique({ where: { slug }, select: { id: true } })
  if (existing) {
    return NextResponse.json({ error: `Slug "${slug}" is already in use` }, { status: 409 })
  }

  const course = await db.course.create({
    data: {
      slug,
      titleEn:        titleEn.trim(),
      titleAr:        titleAr.trim(),
      descriptionEn:  descriptionEn.trim(),
      descriptionAr:  descriptionAr.trim(),
      shortDescEn:    shortDescEn.trim(),
      shortDescAr:    shortDescAr.trim(),
      price:          Number(price),
      isMemberOnly,
      level,
      categoryEn:     categoryEn?.trim() || null,
      categoryAr:     categoryAr?.trim() || null,
      thumbnail:      thumbnail?.trim() || null,
      previewVideoUrl: previewVideoUrl?.trim() || null,
    },
    select: { id: true, slug: true },
  })

  return NextResponse.json({ course }, { status: 201 })
}
