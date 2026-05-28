/**
 * GET  /api/certificates        — list the authenticated user's certificates
 * POST /api/certificates        — issue a certificate for a completed course
 *   body: { courseId: string }
 */
import { NextRequest, NextResponse }            from 'next/server'
import { getServerSession }                     from 'next-auth'
import { authOptions }                          from '@/lib/auth'
import {
  issueCertificate,
  getUserCertificates,
  CourseNotCompleteError,
  NotEnrolledError,
}                                               from '@/lib/certificates'

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const certificates = await getUserCertificates(session.user.id)
  return NextResponse.json({ certificates })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body     = await req.json().catch(() => ({})) as { courseId?: string }
  const courseId = body.courseId?.trim() ?? ''

  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  try {
    const cert = await issueCertificate(session.user.id, courseId)
    return NextResponse.json({ certificate: cert }, { status: 201 })
  } catch (err) {
    if (err instanceof NotEnrolledError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    if (err instanceof CourseNotCompleteError) {
      return NextResponse.json(
        { error: err.message, total: err.total, completed: err.completed },
        { status: 422 },
      )
    }
    console.error('[certificates] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
