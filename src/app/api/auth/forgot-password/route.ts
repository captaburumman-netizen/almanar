/**
 * POST /api/auth/forgot-password
 *
 * Looks up the email, creates a signed reset token (valid 1 hour),
 * and sends a password-reset email via Resend.
 * Always returns 200 to prevent email enumeration.
 *
 * Rate-limited: 3 requests per hour per IP to prevent email bombing.
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { forgotPasswordSchema } from '@/lib/validations'
import { sendEmail } from '@/lib/resend'
import { PasswordResetEmail } from '@/emails/PasswordResetEmail'
import { rateLimit, rateLimitResponse, getClientIp } from '@/lib/rateLimit'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const TOKEN_TTL_MINUTES = 60

export async function POST(req: NextRequest) {
  // ── Rate limit: 3 requests per hour per IP (prevent email bombing) ────────
  const ip = getClientIp(req)
  const { success, resetAt } = rateLimit(`forgot-pw:${ip}`, 3, 60 * 60 * 1000)
  if (!success) return rateLimitResponse(resetAt)

  try {
    const body = await req.json()

    // ── Validate input ────────────────────────────────────────────────────────
    const parsed = forgotPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const normalizedEmail = parsed.data.email.toLowerCase().trim()

    // ── Lookup user — always 200 to prevent enumeration ───────────────────────
    const user = await db.user.findUnique({
      where:  { email: normalizedEmail },
      select: { id: true, email: true, name: true, preferredLocale: true },
    })

    if (!user) {
      // Return success regardless so attackers can't probe which emails exist
      return NextResponse.json({ success: true })
    }

    // ── Delete any existing tokens for this user ──────────────────────────────
    await db.passwordResetToken.deleteMany({ where: { userId: user.id } })

    // ── Create a new token ────────────────────────────────────────────────────
    const rawToken = randomBytes(32).toString('hex')
    const expires  = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000)

    await db.passwordResetToken.create({
      data: { token: rawToken, userId: user.id, email: user.email, expires },
    })

    // ── Build reset URL ───────────────────────────────────────────────────────
    const locale   = user.preferredLocale ?? 'ar'
    const resetUrl = `${APP_URL}/${locale}/auth/reset-password?token=${rawToken}`

    const subject = locale === 'ar'
      ? 'إعادة تعيين كلمة مرور المنار'
      : 'Reset your ALMANAR password'

    await sendEmail({
      to:    user.email,
      subject,
      react: PasswordResetEmail({ resetUrl, locale }),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[forgot-password]', err)
    // Still return 200 — no info leak
    return NextResponse.json({ success: true })
  }
}
