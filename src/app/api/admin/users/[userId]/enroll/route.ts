/**
 * POST   /api/admin/users/[userId]/enroll   — manually enroll (ADMIN access type)
 * DELETE /api/admin/users/[userId]/enroll   — remove a specific enrollment
 *
 * POST body:  { courseId: string }
 * DELETE body: { courseId: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession }       from '@/lib/adminGuard'
import { db }                        from '@/lib/db'

interface Params {
  params: Promise<{ userId: string }>
}

// ─── POST — grant enrollment ──────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { userId } = await params

  const body = await req.json().catch(() => ({})) as { courseId?: string }
  const { courseId } = body

  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  // Verify both user and course exist
  const [user, course] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { id: true } }),
    db.course.findUnique({ where: { id: courseId }, select: { id: true } }),
  ])
  if (!user)   return NextResponse.json({ error: 'User not found' },   { status: 404 })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const enrollment = await db.enrollment.upsert({
    where:  { userId_courseId: { userId, courseId } },
    create: { userId, courseId, accessType: 'ADMIN' },
    update: { accessType: 'ADMIN' },
  })

  return NextResponse.json({ enrollment }, { status: 201 })
}

// ─── DELETE — remove enrollment ───────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { userId } = await params

  const body = await req.json().catch(() => ({})) as { courseId?: string }
  const { courseId } = body

  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  await db.enrollment.deleteMany({
    where: { userId, courseId },
  }).catch(() => { /* non-fatal */ })

  return NextResponse.json({ ok: true })
}
