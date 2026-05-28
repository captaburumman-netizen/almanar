/**
 * Unit tests — GET /api/health
 *
 * Covers: 200 status, JSON shape (status, timestamp, environment),
 *         ISO 8601 timestamp format, environment value.
 *
 * No mocking needed — the route is a pure handler with no external I/O.
 */

import { GET } from '@/app/api/health/route'

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/health
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/health', () => {
  it('returns HTTP 200', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('returns status "ok"', async () => {
    const res  = await GET()
    const body = await res.json() as { status: string }
    expect(body.status).toBe('ok')
  })

  it('includes a timestamp field as a string', async () => {
    const res  = await GET()
    const body = await res.json() as { timestamp: string }
    expect(typeof body.timestamp).toBe('string')
    expect(body.timestamp.length).toBeGreaterThan(0)
  })

  it('timestamp is in ISO 8601 format', async () => {
    const res  = await GET()
    const { timestamp } = await res.json() as { timestamp: string }
    // ISO 8601: starts with YYYY-MM-DDTHH:mm:ss...
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(new Date(timestamp).toISOString()).toBe(timestamp)
  })

  it('timestamp is close to the current time (within 5 s)', async () => {
    const before = Date.now()
    const res    = await GET()
    const after  = Date.now()
    const { timestamp } = await res.json() as { timestamp: string }
    const ts = new Date(timestamp).getTime()
    expect(ts).toBeGreaterThanOrEqual(before - 50)
    expect(ts).toBeLessThanOrEqual(after + 50)
  })

  it('includes an environment field as a non-empty string', async () => {
    const res  = await GET()
    const body = await res.json() as { environment: string }
    expect(typeof body.environment).toBe('string')
    expect(body.environment.length).toBeGreaterThan(0)
  })

  it('environment is "test" in the Jest environment', async () => {
    const res  = await GET()
    const body = await res.json() as { environment: string }
    // Jest sets NODE_ENV = 'test'
    expect(body.environment).toBe('test')
  })

  it('returns all three required fields in the body', async () => {
    const res  = await GET()
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('status')
    expect(body).toHaveProperty('timestamp')
    expect(body).toHaveProperty('environment')
  })
})
