/**
 * GET /api/stripe/portal?locale=en|ar
 *
 * Redirects the authenticated user to their Stripe Customer Portal
 * where they can manage their subscription, invoices, and payment methods.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession }          from 'next-auth'
import { authOptions }               from '@/lib/auth'
import { db }                        from '@/lib/db'
import { getStripe }                 from '@/lib/stripe'

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get('locale') ?? 'ar'

  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL(`/${locale}/auth/signin`, req.url))
  }

  // ── Load user's Stripe customer ID ────────────────────────────────────────
  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { stripeCustomerId: true },
  }).catch(() => null)

  if (!user?.stripeCustomerId) {
    // No Stripe customer yet — nothing to manage, send to pricing
    return NextResponse.redirect(new URL(`/${locale}/pricing`, req.url))
  }

  // ── Create portal session ─────────────────────────────────────────────────
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer:   user.stripeCustomerId,
    return_url: `${baseUrl}/${locale}/dashboard`,
  })

  return NextResponse.redirect(portalSession.url)
}
