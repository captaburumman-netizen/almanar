/**
 * POST /api/admin/courses/[courseId]/lessons — create a lesson
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession }       from '@/lib/adminGuard'
import { db }                        from '@/lib/db'
import { slugify }                   from '@/lib/utils'

interface Params {
  params: Promise<{ courseId: string }>
}

export async function POST(req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { courseId } = await params

  // Verify course exists
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  })
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({})) as {
    titleEn?:       string
    titleAr?:       string
    descriptionEn?: string
    descriptionAr?: string
    s3Key?:         string
    duration?:      number
    isPreview?:     boolean
    isPublished?:   boolean
    slug?:          string
  }

  const {
    titleEn     = '',
    titleAr     = '',
    descriptionEn,
    descriptionAr,
    s3Key,
    duration,
    isPreview   = false,
    isPublished = false,
    slug:       rawSlug,
  } = body

  if (!titleEn.trim() || !titleAr.trim()) {
    return NextResponse.json({ error: 'titleEn and titleAr are required' }, { status: 400 })
  }

  // Auto-assign position (append to end)
  const lastLesson = await db.lesson.findFirst({
    where:   { courseId },
    orderBy: { position: 'desc' },
    select:  { position: true },
  })
  const position = (lastLesson?.position ?? 0) + 1

  const slug = rawSlug?.trim() || slugify(titleEn) || `lesson-${position}`

  const lesson = await db.lesson.create({
    data: {
      courseId,
      slug,
      titleEn:      titleEn.trim(),
      titleAr:      titleAr.trim(),
      descriptionEn: descriptionEn?.trim() || null,
      descriptionAr: descriptionAr?.trim() || null,
      s3Key:        s3Key?.trim() || null,
      duration:     duration ?? null,
      position,
      isPreview,
      isPublished,
    },
    select: { id: true, slug: true, position: true },
  })

  return NextResponse.json({ lesson }, { status: 201 })
}
