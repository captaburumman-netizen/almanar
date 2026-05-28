/**
 * Unit tests — src/lib/stripe.ts
 *
 * Covers: toCents (pure conversion), BILLING_CURRENCY (env fallback),
 *         getOrCreateStripeCustomer (idempotency + Stripe customers.create args).
 *
 * The Stripe class is mocked so no real API calls are made.
 */

// ─── Mock: Stripe SDK ─────────────────────────────────────────────────────────

const mockCustomersCreate = jest.fn()

jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    customers: {
      create: (...a: unknown[]) => mockCustomersCreate(...a),
    },
  }))
)

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  toCents,
  BILLING_CURRENCY,
  getOrCreateStripeCustomer,
} from '@/lib/stripe'

beforeEach(() => {
  jest.clearAllMocks()
  mockCustomersCreate.mockResolvedValue({ id: 'cus_new_abc' })
})

// ═══════════════════════════════════════════════════════════════════════════════
// toCents — pure price converter
// ═══════════════════════════════════════════════════════════════════════════════

describe('toCents', () => {
  it('converts a whole-number price to cents', () => {
    expect(toCents(10)).toBe(1000)
    expect(toCents(50)).toBe(5000)
  })

  it('converts 9.99 → 999', () => {
    expect(toCents(9.99)).toBe(999)
  })

  it('converts 29.99 → 2999', () => {
    expect(toCents(29.99)).toBe(2999)
  })

  it('converts 49.99 → 4999', () => {
    expect(toCents(49.99)).toBe(4999)
  })

  it('converts 0 → 0', () => {
    expect(toCents(0)).toBe(0)
  })

  it('accepts a numeric string input', () => {
    expect(toCents('19.99')).toBe(1999)
    expect(toCents('100')).toBe(10000)
  })

  it('always returns an integer (Math.round)', () => {
    expect(Number.isInteger(toCents(9.99))).toBe(true)
    expect(Number.isInteger(toCents(0.01))).toBe(true)
  })

  it('rounds fractional cents to the nearest integer', () => {
    // 0.015 * 100 = 1.5 → rounds to 2
    expect(toCents(0.015)).toBe(2)
    // 0.014 * 100 = 1.4 → rounds to 1
    expect(toCents(0.014)).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// BILLING_CURRENCY — env fallback
// ═══════════════════════════════════════════════════════════════════════════════

describe('BILLING_CURRENCY', () => {
  it('is a string', () => {
    expect(typeof BILLING_CURRENCY).toBe('string')
  })

  it('is lowercase', () => {
    expect(BILLING_CURRENCY).toBe(BILLING_CURRENCY.toLowerCase())
  })

  it('defaults to "usd" when BILLING_CURRENCY env var is not set', () => {
    expect(BILLING_CURRENCY).toBe('usd')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// getOrCreateStripeCustomer — idempotency + Stripe API args
// ═══════════════════════════════════════════════════════════════════════════════

describe('getOrCreateStripeCustomer', () => {
  // ── Idempotency — existing customer ─────────────────────────────────────────

  it('returns the existing customerId without calling Stripe', async () => {
    const result = await getOrCreateStripeCustomer(
      'user-1', 'user@test.com', 'Alice', 'cus_existing_123',
    )
    expect(result).toBe('cus_existing_123')
    expect(mockCustomersCreate).not.toHaveBeenCalled()
  })

  it('skips Stripe when existingCustomerId is a non-empty string', async () => {
    await getOrCreateStripeCustomer('u', 'u@t.com', null, 'cus_abc')
    expect(mockCustomersCreate).not.toHaveBeenCalled()
  })

  // ── Create new customer ──────────────────────────────────────────────────────

  it('creates a new customer when existingCustomerId is omitted', async () => {
    const result = await getOrCreateStripeCustomer('user-1', 'user@test.com')
    expect(mockCustomersCreate).toHaveBeenCalledTimes(1)
    expect(result).toBe('cus_new_abc')
  })

  it('creates a new customer when existingCustomerId is null', async () => {
    const result = await getOrCreateStripeCustomer(
      'user-1', 'user@test.com', null, null,
    )
    expect(mockCustomersCreate).toHaveBeenCalledTimes(1)
    expect(result).toBe('cus_new_abc')
  })

  it('passes the user email to Stripe', async () => {
    await getOrCreateStripeCustomer('user-1', 'alice@test.com')
    expect(mockCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alice@test.com' }),
    )
  })

  it('passes the user name to Stripe', async () => {
    await getOrCreateStripeCustomer('user-1', 'alice@test.com', 'Alice Smith')
    expect(mockCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Alice Smith' }),
    )
  })

  it('includes almanarUserId in Stripe customer metadata', async () => {
    await getOrCreateStripeCustomer('user-xyz', 'user@test.com')
    expect(mockCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { almanarUserId: 'user-xyz' },
      }),
    )
  })

  it('returns the customer id from the Stripe response', async () => {
    mockCustomersCreate.mockResolvedValue({ id: 'cus_created_fresh' })
    const result = await getOrCreateStripeCustomer('u', 'u@t.com')
    expect(result).toBe('cus_created_fresh')
  })

  it('passes name as undefined when name arg is null', async () => {
    await getOrCreateStripeCustomer('user-1', 'u@t.com', null)
    expect(mockCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: undefined }),
    )
  })
})
