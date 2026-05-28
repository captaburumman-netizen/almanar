/**
 * POST /api/auth/reset-password
 *
 * Validates the reset token, hashes the new password,
 * updates the user record, and deletes the used token.
 * Returns 400 if the token is invalid or expired.
 *
 * Rate-limited: 5 attempts per hour per IP.
 */
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { resetPasswordSchema } from '@/lib/validations'
import { rateLimit, rateLimitResponse, getClientIp } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  // ── Rate limit: 5 attempts per hour per IP ────────────────────────────────
  const ip = getClientIp(req)
  const { success, resetAt } = rateLimit(`reset-pw:${ip}`, 5, 60 * 60 * 1000)
  if (!success) return rateLimitResponse(resetAt)

  try {
    const body = await req.json()

    // ── Validate input ────────────────────────────────────────────────────────
    const parsed = resetPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { token, password } = parsed.data

    // ── Look up the token ─────────────────────────────────────────────────────
    const resetToken = await db.passwordResetToken.findUnique({
      where:  { token },
      select: { id: true, userId: true, expires: true },
    })

    if (!resetToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset link' },
        { status: 400 }
      )
    }

    if (resetToken.expires < new Date()) {
      // Clean up expired token
      await db.passwordResetToken.delete({ where: { id: resetToken.id } })
      return NextResponse.json(
        { success: false, error: 'This reset link has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // ── Hash new password ─────────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12)

    // ── Update user + delete token in a transaction ───────────────────────────
    await db.$transaction([
      db.user.update({
        where: { id: resetToken.userId },
        data:  { password: hashedPassword },
      }),
      db.passwordResetToken.delete({ where: { id: resetToken.id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[reset-password]', err)
    return NextResponse.json(
      { success: false, error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    )
  }
}
