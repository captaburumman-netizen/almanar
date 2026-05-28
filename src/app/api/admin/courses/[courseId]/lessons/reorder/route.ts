/**
 * PATCH /api/admin/courses/[courseId]/lessons/reorder
 *
 * Re-assigns position values for lessons in a course.
 * Body: { orderedIds: string[] } — lesson IDs in desired order
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession }       from '@/lib/adminGuard'
import { db }                        from '@/lib/db'

interface Params {
  params: Promise<{ courseId: string }>
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { courseId } = await params

  const body = await req.json().catch(() => ({})) as { orderedIds?: string[] }
  const { orderedIds } = body

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: 'orderedIds array is required' }, { status: 400 })
  }

  // Update positions in a transaction
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.lesson.updateMany({
        where: { id, courseId },
        data:  { position: index + 1 },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
