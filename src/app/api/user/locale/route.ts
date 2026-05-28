/**
 * PATCH /api/user/locale
 *
 * Updates the authenticated user's preferred locale.
 * Body: { locale: 'ar' | 'en' }
 *
 * The preferredLocale field controls the language of all transactional emails
 * (enrollment confirmations, certificates, password resets, etc.).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession }          from 'next-auth'
import { authOptions }               from '@/lib/auth'
import { db }                        from '@/lib/db'

const VALID_LOCALES = ['ar', 'en'] as const
type ValidLocale = (typeof VALID_LOCALES)[number]

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { locale?: string }
  const locale = body.locale?.trim()

  if (!locale || !VALID_LOCALES.includes(locale as ValidLocale)) {
    return NextResponse.json(
      { error: 'locale must be "ar" or "en"' },
      { status: 422 },
    )
  }

  const updated = await db.user.update({
    where:  { id: session.user.id },
    data:   { preferredLocale: locale as ValidLocale },
    select: { preferredLocale: true },
  })

  return NextResponse.json({ locale: updated.preferredLocale })
}
