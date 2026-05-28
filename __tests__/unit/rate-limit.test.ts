/**
 * Unit tests for the rate-limit library.
 *
 * Covers:
 *   rateLimit()         — allow/block, window reset, remaining count
 *   rateLimitResponse() — 429 status, Retry-After header
 *   getClientIp()       — x-forwarded-for extraction, fallback
 *
 * Note: These tests use Jest's fake timers to control Date.now() so that
 * window resets are deterministic without real sleeps.
 */

import { rateLimit, rateLimitResponse, getClientIp } from '@/lib/rateLimit'

// ─── rateLimit() ──────────────────────────────────────────────────────────────

describe('rateLimit()', () => {
  beforeEach(() => {
    // Use a unique key prefix per test to avoid store collisions
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('allows requests within the limit', () => {
    const key = `test-allow-${Date.now()}-${Math.random()}`
    const r1  = rateLimit(key, 3, 60_000)
    const r2  = rateLimit(key, 3, 60_000)
    const r3  = rateLimit(key, 3, 60_000)

    expect(r1.success).toBe(true)
    expect(r2.success).toBe(true)
    expect(r3.success).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('blocks requests that exceed the limit', () => {
    const key = `test-block-${Date.now()}-${Math.random()}`
    rateLimit(key, 2, 60_000)
    rateLimit(key, 2, 60_000)
    const r3 = rateLimit(key, 2, 60_000)

    expect(r3.success).toBe(false)
    expect(r3.remaining).toBe(0)
  })

  it('returns the correct remaining count', () => {
    const key = `test-remaining-${Date.now()}-${Math.random()}`
    const r1  = rateLimit(key, 5, 60_000)
    const r2  = rateLimit(key, 5, 60_000)

    expect(r1.remaining).toBe(4)
    expect(r2.remaining).toBe(3)
  })

  it('resets the window after the window period expires', () => {
    const key = `test-reset-${Date.now()}-${Math.random()}`

    // Use up the limit
    rateLimit(key, 2, 1_000)
    rateLimit(key, 2, 1_000)
    const blocked = rateLimit(key, 2, 1_000)
    expect(blocked.success).toBe(false)

    // Advance time past the window
    jest.advanceTimersByTime(1_001)

    // Should be allowed again in the new window
    const after = rateLimit(key, 2, 1_000)
    expect(after.success).toBe(true)
    expect(after.remaining).toBe(1)
  })

  it('returns a resetAt timestamp in the future', () => {
    const key    = `test-reset-at-${Date.now()}-${Math.random()}`
    const now    = Date.now()
    const result = rateLimit(key, 5, 30_000)

    expect(result.resetAt).toBeGreaterThan(now)
    expect(result.resetAt).toBeLessThanOrEqual(now + 30_000 + 50) // small tolerance
  })

  it('treats different keys independently', () => {
    const k1 = `key-a-${Math.random()}`
    const k2 = `key-b-${Math.random()}`

    rateLimit(k1, 1, 60_000)
    const blocked = rateLimit(k1, 1, 60_000)
    const allowed = rateLimit(k2, 1, 60_000)

    expect(blocked.success).toBe(false)
    expect(allowed.success).toBe(true)
  })
})

// ─── rateLimitResponse() ─────────────────────────────────────────────────────

describe('rateLimitResponse()', () => {
  it('returns a 429 response', async () => {
    const resetAt  = Date.now() + 30_000
    const response = rateLimitResponse(resetAt)

    expect(response.status).toBe(429)
  })

  it('includes Retry-After header', async () => {
    const resetAt  = Date.now() + 30_000
    const response = rateLimitResponse(resetAt)
    const retryAfter = response.headers.get('Retry-After')

    expect(retryAfter).not.toBeNull()
    expect(Number(retryAfter)).toBeGreaterThan(0)
    expect(Number(retryAfter)).toBeLessThanOrEqual(30)
  })

  it('includes X-RateLimit-Reset header', async () => {
    const resetAt  = Date.now() + 60_000
    const response = rateLimitResponse(resetAt)
    const header   = response.headers.get('X-RateLimit-Reset')

    expect(header).not.toBeNull()
    expect(Number(header)).toBeGreaterThan(Date.now() / 1000)
  })

  it('includes X-RateLimit-Remaining: 0 header', async () => {
    const response = rateLimitResponse(Date.now() + 1000)
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  it('response body is valid JSON with error field', async () => {
    const response = rateLimitResponse(Date.now() + 1000)
    const body     = await response.json()
    expect(body.error).toBeDefined()
    expect(typeof body.error).toBe('string')
  })
})

// ─── getClientIp() ───────────────────────────────────────────────────────────

describe('getClientIp()', () => {
  function makeReq(headers: Record<string, string>): Request {
    return new Request('http://localhost/test', { headers })
  }

  it('returns the first IP from x-forwarded-for', () => {
    const req = makeReq({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12' })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('handles single IP in x-forwarded-for', () => {
    const req = makeReq({ 'x-forwarded-for': '203.0.113.42' })
    expect(getClientIp(req)).toBe('203.0.113.42')
  })

  it('trims whitespace from the IP', () => {
    const req = makeReq({ 'x-forwarded-for': '  10.0.0.1  , 10.0.0.2' })
    expect(getClientIp(req)).toBe('10.0.0.1')
  })

  it('falls back to "local" when x-forwarded-for is absent', () => {
    const req = makeReq({})
    expect(getClientIp(req)).toBe('local')
  })
})
