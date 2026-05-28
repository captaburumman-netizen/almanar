/**
 * POST /api/auth/register
 *
 * Creates a new STUDENT account, then sends a welcome email.
 * Returns 201 on success, 409 if email taken, 400 for validation errors.
 *
 * Rate-limited: 5 registrations per hour per IP address.
 */
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { registerSchema } from '@/lib/validations'
import { sendEmail, addToMailingList } from '@/lib/resend'
import { WelcomeEmail } from '@/emails/WelcomeEmail'
import { rateLimit, rateLimitResponse, getClientIp } from '@/lib/rateLimit'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  // ── Rate limit: 5 registrations per hour per IP ──────────────────────────
  const ip = getClientIp(req)
  const { success, resetAt } = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)
  if (!success) return rateLimitResponse(resetAt)

  try {
    const body = await req.json()

    // ── Validate input ────────────────────────────────────────────────────────
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, password, locale } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    // ── Check for existing account ────────────────────────────────────────────
    const existing = await db.user.findUnique({
      where:  { email: normalizedEmail },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // ── Hash password ─────────────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12)

    // ── Create user ───────────────────────────────────────────────────────────
    const user = await db.user.create({
      data: {
        name,
        email:           normalizedEmail,
        password:        hashedPassword,
        role:            'STUDENT',
        preferredLocale: locale,
      },
      select: { id: true, email: true, name: true },
    })

    // ── Send welcome email + add to mailing list (non-blocking) ──────────────
    const subject = locale === 'ar'
      ? 'مرحبًا بك في المنار'
      : 'Welcome to ALMANAR'

    await sendEmail({
      to:      user.email,
      subject,
      react:   WelcomeEmail({ name: user.name ?? '', locale, appUrl: APP_URL }),
    })

    // Non-fatal: add to Resend Audience for broadcast emails
    void addToMailingList(user.email, user.name)

    return NextResponse.json(
      { success: true, data: { id: user.id, email: user.email } },
      { status: 201 }
    )
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}
