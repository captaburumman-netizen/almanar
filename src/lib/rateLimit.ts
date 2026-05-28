/**
 * In-memory sliding window rate limiter.
 *
 * Uses a per-key counter that resets at the end of each window.
 * Safe for single-server / Vercel serverless (each function instance is
 * independent, so limits are per-instance — good enough for abuse protection).
 *
 * For multi-replica production use, swap the Map store for Upstash Redis.
 *
 * Usage:
 *   const ip = getClientIp(req)
 *   const { success, resetAt } = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)
 *   if (!success) return rateLimitResponse(resetAt)
 */

interface RateLimitWindow {
  count:   number
  resetAt: number  // Unix timestamp in ms
}

// Module-level store (lives for the process lifetime)
const store = new Map<string, RateLimitWindow>()

export interface RateLimitResult {
  success:   boolean  // true = request is within the limit
  remaining: number   // how many requests are left in the current window
  resetAt:   number   // when the window resets (Unix ms)
}

/**
 * Check / increment the rate limit for a given key.
 *
 * @param key      Unique identifier (e.g. `register:${ip}`)
 * @param max      Maximum requests allowed per window
 * @param windowMs Window size in milliseconds
 */
export function rateLimit(
  key:      string,
  max:      number,
  windowMs: number,
): RateLimitResult {
  const now    = Date.now()
  let   window = store.get(key)

  if (!window || now >= window.resetAt) {
    // Start a fresh window
    window = { count: 0, resetAt: now + windowMs }
    store.set(key, window)
  }

  window.count += 1

  const success   = window.count <= max
  const remaining = Math.max(0, max - window.count)

  return { success, remaining, resetAt: window.resetAt }
}

/**
 * Returns a JSON 429 response with Retry-After header.
 * Call this when rateLimit() returns success = false.
 */
export function rateLimitResponse(resetAt: number): Response {
  const retryAfterSecs = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))

  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status:  429,
      headers: {
        'Content-Type':        'application/json',
        'Retry-After':         String(retryAfterSecs),
        'X-RateLimit-Reset':   String(Math.ceil(resetAt / 1000)),
        'X-RateLimit-Remaining': '0',
      },
    },
  )
}

/**
 * Extracts the real client IP from a Next.js Request.
 * Prefers x-forwarded-for (set by Vercel/Cloudflare/proxies).
 * Falls back to a static key if the header is absent (dev / direct connections).
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; take the first (original client)
    return forwarded.split(',')[0]!.trim()
  }
  // Fallback — all requests from the same origin get the same bucket
  return 'local'
}

/** Purge all expired windows (call periodically in long-running servers). */
export function pruneExpiredWindows(): void {
  const now = Date.now()
  for (const [key, window] of store) {
    if (now >= window.resetAt) store.delete(key)
  }
}
