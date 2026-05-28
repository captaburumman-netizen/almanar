/**
 * GET    /api/admin/courses/[courseId] — fetch single course with lessons
 * PATCH  /api/admin/courses/[courseId] — update course fields
 * DELETE /api/admin/courses/[courseId] — delete course (and cascade lessons/enrollments)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession }       from '@/lib/adminGuard'
import { db }                        from '@/lib/db'
import type { Level }                from '@prisma/client'

interface Params {
  params: Promise<{ courseId: string }>
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { courseId } = await params

  const course = await db.course.findUnique({
    where:  { id: courseId },
    include: {
      lessons: {
        orderBy: { position: 'asc' },
        select: {
          id:          true,
          slug:        true,
          titleEn:     true,
          titleAr:     true,
          position:    true,
          isPreview:   true,
          isPublished: true,
          duration:    true,
          s3Key:       true,
        },
      },
    },
  })

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  return NextResponse.json({ course })
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { courseId } = await params

  const body = await req.json().catch(() => ({})) as {
    titleEn?:        string
    titleAr?:        string
    descriptionEn?:  string
    descriptionAr?:  string
    shortDescEn?:    string
    shortDescAr?:    string
    price?:          string | number
    isMemberOnly?:   boolean
    level?:          Level
    categoryEn?:     string | null
    categoryAr?:     string | null
    thumbnail?:      string | null
    previewVideoUrl?: string | null
    isPublished?:    boolean
  }

  // Build update payload from provided fields only
  const data: Record<string, unknown> = {}
  if (body.titleEn        !== undefined) data.titleEn        = body.titleEn.trim()
  if (body.titleAr        !== undefined) data.titleAr        = body.titleAr.trim()
  if (body.descriptionEn  !== undefined) data.descriptionEn  = body.descriptionEn.trim()
  if (body.descriptionAr  !== undefined) data.descriptionAr  = body.descriptionAr.trim()
  if (body.shortDescEn    !== undefined) data.shortDescEn    = body.shortDescEn.trim()
  if (body.shortDescAr    !== undefined) data.shortDescAr    = body.shortDescAr.trim()
  if (body.price          !== undefined) data.price          = Number(body.price)
  if (body.isMemberOnly   !== undefined) data.isMemberOnly   = body.isMemberOnly
  if (body.level          !== undefined) data.level          = body.level
  if (body.categoryEn     !== undefined) data.categoryEn     = body.categoryEn?.trim() || null
  if (body.categoryAr     !== undefined) data.categoryAr     = body.categoryAr?.trim() || null
  if (body.thumbnail      !== undefined) data.thumbnail      = body.thumbnail?.trim() || null
  if (body.previewVideoUrl!== undefined) data.previewVideoUrl= body.previewVideoUrl?.trim() || null
  if (body.isPublished    !== undefined) data.isPublished    = body.isPublished

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const course = await db.course.update({
    where: { id: courseId },
    data,
    select: { id: true, slug: true, isPublished: true },
  }).catch(() => null)

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  return NextResponse.json({ course })
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { courseId } = await params

  await db.course.delete({ where: { id: courseId } }).catch(() => null)

  return NextResponse.json({ ok: true })
}
