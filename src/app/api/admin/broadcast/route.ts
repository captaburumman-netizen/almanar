/**
 * POST /api/admin/broadcast
 *
 * Body:
 *   { audience, subject, body, preview?: boolean }
 *
 * When preview=true  → returns { count: number } only (no emails sent)
 * When preview=false → sends emails, returns { sent, failed }
 */
import { NextRequest, NextResponse }     from 'next/server'
import { requireAdminSession }           from '@/lib/adminGuard'
import {
  getAudienceRecipients,
  sendBroadcast,
  AUDIENCE_OPTIONS,
}                                        from '@/lib/broadcast'
import type { AudienceType }             from '@/lib/broadcast'

const VALID_AUDIENCES = AUDIENCE_OPTIONS.map((o) => o.value)

export async function POST(req: NextRequest) {
  const { error } = await requireAdminSession()
  if (error) return error

  const body = await req.json().catch(() => ({})) as {
    audience?: string
    subject?:  string
    body?:     string
    preview?:  boolean
  }

  const { audience, subject, body: msgBody, preview = false } = body

  // ── Validate ───────────────────────────────────────────────────────────────
  if (!audience || !(VALID_AUDIENCES as string[]).includes(audience)) {
    return NextResponse.json(
      { error: `audience must be one of: ${VALID_AUDIENCES.join(', ')}` },
      { status: 400 },
    )
  }
  if (!subject?.trim()) {
    return NextResponse.json({ error: 'subject is required' }, { status: 400 })
  }
  if (!msgBody?.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }

  // ── Fetch recipients ───────────────────────────────────────────────────────
  const recipients = await getAudienceRecipients(audience as AudienceType)  // already validated above

  if (preview) {
    return NextResponse.json({ count: recipients.length })
  }

  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 })
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  const result = await sendBroadcast({
    recipients,
    subject: subject.trim(),
    body:    msgBody.trim(),
  })

  return NextResponse.json(result)
}
