/**
 * Stripe client — lazy singleton.
 *
 * Instantiated on first use, not at module load, so Next.js build succeeds
 * even when STRIPE_SECRET_KEY is absent (same pattern as Resend).
 *
 * Only import this file in server-side code (API routes, Server Components).
 * Never import it in client components.
 */
import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing env: STRIPE_SECRET_KEY')
    }
    // Development / test — use a dummy key so the module loads without crashing.
    _stripe = new Stripe('sk_test_dummy_key_for_build', {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
    return _stripe
  }

  _stripe = new Stripe(key, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
    appInfo: { name: 'ALMANAR', version: '0.1.0' },
  })
  return _stripe
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get or create a Stripe customer for a given user.
 * Idempotent — will not create duplicate customers.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string | null,
  existingCustomerId?: string | null
): Promise<string> {
  if (existingCustomerId) return existingCustomerId

  const customer = await getStripe().customers.create({
    email,
    name: name ?? undefined,
    metadata: { almanarUserId: userId },
  })

  return customer.id
}

/**
 * Currency used for all Stripe charges.
 * Sourced from env so it can be changed without code changes.
 */
export const BILLING_CURRENCY = (
  process.env.BILLING_CURRENCY ?? 'usd'
).toLowerCase()

/**
 * Convert a Decimal/number price to Stripe's integer cents format.
 */
export function toCents(amount: number | string): number {
  return Math.round(Number(amount) * 100)
}
