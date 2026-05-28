/**
 * Unit tests — src/lib/rateLimit.ts
 *
 * The module uses an in-process Map and Date.now(), so we pin the clock
 * with fake timers to make window-reset behaviour deterministic.
 *
 * Each test uses a unique key to prevent cross-test contamination
 * from the shared module-level store.
 *
 * Covers: rateLimit, rateLimitResponse, getClientIp, pruneExpiredWindows.
 */

// ─── Fixed clock ──────────────────────────────────────────────────────────────

const START = 1_718_000_000_000  // arbitrary epoch ms

beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(START)
})

afterAll(() => {
  jest.useRealTimers()
})

import {
  rateLimit,
  rateLimitResponse,
  getClientIp,
  pruneExpiredWindows,
} from '@/lib/rateLimit'

// ─── Key factory: guarantee uniqueness across all tests ───────────────────────

let seq = 0
function key(label = 'test') { return `${label}:${++seq}` }

// ═══════════════════════════════════════════════════════════════════════════════
// rateLimit — core behaviour
// ═══════════════════════════════════════════════════════════════════════════════

describe('rateLimit', () => {
  it('allows the first request (success = true)', () => {
    const { success } = rateLimit(key(), 5, 60_000)
    expect(success).toBe(true)
  })

  it('decrements remaining with each request', () => {
    const k = key()
    rateLimit(k, 3, 60_000)          // 1st → remaining 2
    const { remaining } = rateLimit(k, 3, 60_000)  // 2nd → remaining 1
    expect(remaining).toBe(1)
  })

  it('blocks the request when count exceeds max (success = false)', () => {
    const k = key()
    rateLimit(k, 2, 60_000)  // 1
    rateLimit(k, 2, 60_000)  // 2 — at limit
    const { success } = rateLimit(k, 2, 60_000)  // 3 — over limit
    expect(success).toBe(false)
  })

  it('returns remaining = 0 when the limit is exceeded', () => {
    const k = key()
    rateLimit(k, 1, 60_000)  // 1 — at limit
    const { remaining } = rateLimit(k, 1, 60_000)  // 2 — over
    expect(remaining).toBe(0)
  })

  it('returns a resetAt timestamp in the future', () => {
    const { resetAt } = rateLimit(key(), 5, 60_000)
    expect(resetAt).toBeGreaterThan(START)
    expect(resetAt).toBe(START + 60_000)
  })

  it('resets the window after windowMs has elapsed', () => {
    const k = key()
    rateLimit(k, 2, 60_000)   // 1
    rateLimit(k, 2, 60_000)   // 2 — at limit

    // Advance past the window
    jest.setSystemTime(START + 60_001)

    const { success, remaining } = rateLimit(k, 2, 60_000)
    expect(success).toBe(true)
    expect(remaining).toBe(1)   // first request of fresh window

    // Restore clock
    jest.setSystemTime(START)
  })

  it('handles max = 1: allows first, blocks second', () => {
    const k = key()
    expect(rateLimit(k, 1, 60_000).success).toBe(true)
    expect(rateLimit(k, 1, 60_000).success).toBe(false)
  })

  it('tracks independent keys separately', () => {
    const k1 = key('ip1')
    const k2 = key('ip2')
    rateLimit(k1, 1, 60_000)   // k1: exhausted
    rateLimit(k1, 1, 60_000)

    const { success } = rateLimit(k2, 1, 60_000)  // k2: fresh
    expect(success).toBe(true)
  })

  it('returns remaining = max - 1 on the very first hit', () => {
    const { remaining } = rateLimit(key(), 10, 60_000)
    expect(remaining).toBe(9)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// rateLimitResponse — HTTP 429 factory
// ═══════════════════════════════════════════════════════════════════════════════

describe('rateLimitResponse', () => {
  const RESET_AT = START + 30_000  // 30 s from now

  it('returns a 429 status', () => {
    const res = rateLimitResponse(RESET_AT)
    expect(res.status).toBe(429)
  })

  it('includes a Retry-After header in whole seconds', () => {
    const res = rateLimitResponse(RESET_AT)
    const retryAfter = res.headers.get('Retry-After')
    expect(retryAfter).toBe('30')
  })

  it('includes Content-Type application/json', () => {
    const res = rateLimitResponse(RESET_AT)
    expect(res.headers.get('Content-Type')).toBe('application/json')
  })

  it('includes X-RateLimit-Remaining: 0', () => {
    const res = rateLimitResponse(RESET_AT)
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  it('body contains an error key', async () => {
    const res = rateLimitResponse(RESET_AT)
    const json = await res.json() as { error: string }
    expect(typeof json.error).toBe('string')
    expect(json.error.length).toBeGreaterThan(0)
  })

  it('clamps Retry-After to at least 1 second when resetAt is in the past', () => {
    const pastReset = START - 5_000
    const res = rateLimitResponse(pastReset)
    const retryAfter = Number(res.headers.get('Retry-After'))
    expect(retryAfter).toBeGreaterThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// getClientIp — extract real IP from request
// ═══════════════════════════════════════════════════════════════════════════════

describe('getClientIp', () => {
  function makeReq(headers: Record<string, string>): Request {
    return new Request('http://localhost/api/test', { headers })
  }

  it('returns the first IP from x-forwarded-for when set', () => {
    const req = makeReq({ 'x-forwarded-for': '1.2.3.4' })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('handles a comma-separated x-forwarded-for list (takes the first)', () => {
    const req = makeReq({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1, 172.16.0.1' })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('trims whitespace around the IP', () => {
    const req = makeReq({ 'x-forwarded-for': '  5.6.7.8  ' })
    expect(getClientIp(req)).toBe('5.6.7.8')
  })

  it('returns "local" when x-forwarded-for header is absent', () => {
    const req = makeReq({})
    expect(getClientIp(req)).toBe('local')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// pruneExpiredWindows — evict stale entries
// ═══════════════════════════════════════════════════════════════════════════════

describe('pruneExpiredWindows', () => {
  it('does not throw when called with an empty store', () => {
    expect(() => pruneExpiredWindows()).not.toThrow()
  })

  it('removes expired windows and allows fresh limits after pruning', () => {
    const k = key('prune')
    // Exhaust the limit
    rateLimit(k, 1, 1_000)   // 1st  → success
    rateLimit(k, 1, 1_000)   // 2nd  → blocked

    // Advance past window
    jest.setSystemTime(START + 2_000)
    pruneExpiredWindows()

    // After pruning, the key is gone → a fresh window starts
    const { success } = rateLimit(k, 1, 1_000)
    expect(success).toBe(true)

    // Restore clock
    jest.setSystemTime(START)
  })
})
