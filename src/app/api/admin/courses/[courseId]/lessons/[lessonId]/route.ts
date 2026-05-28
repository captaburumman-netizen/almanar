/**
 * PATCH  /api/admin/courses/[courseId]/lessons/[lessonId] — update a lesson
 * DELETE /api/admin/courses/[courseId]/lessons/[lessonId] — delete a lesson
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession }       from '@/lib/adminGuard'
import { db }                        from '@/lib/db'

interface Params {
  params: Promise<{ courseId: string; lessonId: string }>
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { courseId, lessonId } = await params

  const body = await req.json().catch(() => ({})) as {
    titleEn?:       string
    titleAr?:       string
    descriptionEn?: string | null
    descriptionAr?: string | null
    s3Key?:         string | null
    duration?:      number | null
    isPreview?:     boolean
    isPublished?:   boolean
  }

  const data: Record<string, unknown> = {}
  if (body.titleEn       !== undefined) data.titleEn       = body.titleEn.trim()
  if (body.titleAr       !== undefined) data.titleAr       = body.titleAr.trim()
  if (body.descriptionEn !== undefined) data.descriptionEn = body.descriptionEn?.trim() || null
  if (body.descriptionAr !== undefined) data.descriptionAr = body.descriptionAr?.trim() || null
  if (body.s3Key         !== undefined) data.s3Key         = body.s3Key?.trim() || null
  if (body.duration      !== undefined) data.duration      = body.duration ?? null
  if (body.isPreview     !== undefined) data.isPreview     = body.isPreview
  if (body.isPublished   !== undefined) data.isPublished   = body.isPublished

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const lesson = await db.lesson.update({
    where: { id: lessonId, courseId },
    data,
    select: { id: true, slug: true, isPublished: true },
  }).catch(() => null)

  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  return NextResponse.json({ lesson })
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { courseId, lessonId } = await params

  await db.lesson.delete({ where: { id: lessonId, courseId } }).catch(() => null)

  return NextResponse.json({ ok: true })
}
