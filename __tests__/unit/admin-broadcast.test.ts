/**
 * Unit tests for admin broadcast email.
 *
 * Covers:
 *   lib/broadcast   — getAudienceRecipients, chunkArray (via sendBroadcast)
 *   POST /api/admin/broadcast  — validation, preview mode, send mode
 */

import { NextRequest } from 'next/server'

/* ─── mock: adminGuard ───────────────────────────────────────────────────── */
const mockRequireAdminSession = jest.fn()
jest.mock('@/lib/adminGuard', () => ({
  requireAdminSession: (...a: unknown[]) => mockRequireAdminSession(...a),
}))

/* ─── mock: Prisma ───────────────────────────────────────────────────────── */
const mockUserFindMany = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findMany: (...a: unknown[]) => mockUserFindMany(...a),
      count:    () => Promise.resolve(0),
    },
    subscription:    { count: () => Promise.resolve(0) },
    enrollment:      { count: () => Promise.resolve(0) },
    productPurchase: { count: () => Promise.resolve(0) },
  },
}))

/* ─── mock: Resend batch send ────────────────────────────────────────────── */
const mockBatchSend = jest.fn()
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    batch: { send: (...a: unknown[]) => mockBatchSend(...a) },
  })),
}))

/* ─── mock: React createElement (for email template rendering) ───────────── */
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  createElement: jest.fn().mockReturnValue('<BroadcastEmail/>'),
}))

/* ─── mock: email template ────────────────────────────────────────────────── */
jest.mock('@/emails/BroadcastEmail', () => ({
  BroadcastEmail: () => null,
}))

/* ─── helpers ────────────────────────────────────────────────────────────── */
const ADMIN_SESSION = { session: { user: { id: 'admin-1', role: 'ADMIN' } }, error: null }
const UNAUTHED      = { session: null, error: new Response('{}', { status: 401 }) }

function makeReq(body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/broadcast', {
    method: 'POST',
    body:   JSON.stringify(body ?? {}),
    headers: { 'Content-Type': 'application/json' },
  })
}

/* ─── dynamic imports ────────────────────────────────────────────────────── */
let POST: (req: NextRequest) => Promise<any>
let getAudienceRecipients: typeof import('@/lib/broadcast').getAudienceRecipients
let sendBroadcast:         typeof import('@/lib/broadcast').sendBroadcast

beforeAll(async () => {
  const route = await import('@/app/api/admin/broadcast/route')
  const lib   = await import('@/lib/broadcast')
  POST                  = route.POST
  getAudienceRecipients = lib.getAudienceRecipients
  sendBroadcast         = lib.sendBroadcast
})

beforeEach(() => {
  jest.clearAllMocks()
  mockRequireAdminSession.mockResolvedValue(ADMIN_SESSION)
})

// ─── getAudienceRecipients ────────────────────────────────────────────────────

describe('getAudienceRecipients()', () => {
  const users = [{ email: 'a@test.com', name: 'Alice' }, { email: 'b@test.com', name: 'Bob' }]

  it('queries all users for ALL audience', async () => {
    mockUserFindMany.mockResolvedValue(users)
    const result = await getAudienceRecipients('ALL')
    expect(result).toHaveLength(2)
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ email: { not: '' } }) })
    )
  })

  it('queries subscribers with ACTIVE status for SUBSCRIBERS audience', async () => {
    mockUserFindMany.mockResolvedValue(users)
    await getAudienceRecipients('SUBSCRIBERS')
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { subscription: { status: 'ACTIVE' } } })
    )
  })

  it('queries enrolled users for ENROLLEES audience', async () => {
    mockUserFindMany.mockResolvedValue(users)
    await getAudienceRecipients('ENROLLEES')
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { enrollments: { some: {} } } })
    )
  })

  it('queries purchasers for PURCHASERS audience', async () => {
    mockUserFindMany.mockResolvedValue(users)
    await getAudienceRecipients('PURCHASERS')
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { productPurchases: { some: { status: 'COMPLETED' } } } })
    )
  })

  it('returns empty array for unknown audience type', async () => {
    const result = await getAudienceRecipients('UNKNOWN' as any)
    expect(result).toEqual([])
    expect(mockUserFindMany).not.toHaveBeenCalled()
  })
})

// ─── sendBroadcast ────────────────────────────────────────────────────────────

describe('sendBroadcast()', () => {
  it('calls batch.send for each chunk of recipients', async () => {
    mockBatchSend.mockResolvedValue({ data: true, error: null })
    const recipients = Array.from({ length: 150 }, (_, i) => ({
      email: `user${i}@test.com`,
      name:  `User ${i}`,
    }))
    const result = await sendBroadcast({ recipients, subject: 'Hi', body: 'Hello everyone' })
    // 150 recipients → 2 batches (100 + 50)
    expect(mockBatchSend).toHaveBeenCalledTimes(2)
    expect(result.sent).toBe(150)
    expect(result.failed).toBe(0)
  })

  it('counts failures when batch errors', async () => {
    mockBatchSend
      .mockResolvedValueOnce({ data: null, error: { message: 'API error' } })
      .mockResolvedValueOnce({ data: true, error: null })
    const recipients = Array.from({ length: 120 }, (_, i) => ({
      email: `user${i}@test.com`,
      name:  null,
    }))
    const result = await sendBroadcast({ recipients, subject: 'Hi', body: 'Hello' })
    expect(result.failed).toBe(100) // first batch failed
    expect(result.sent).toBe(20)    // second batch succeeded
  })

  it('handles batch exceptions gracefully', async () => {
    mockBatchSend.mockRejectedValue(new Error('Network error'))
    const recipients = [{ email: 'a@test.com', name: 'Alice' }]
    const result = await sendBroadcast({ recipients, subject: 'Hi', body: 'Hello' })
    expect(result.failed).toBe(1)
    expect(result.sent).toBe(0)
  })
})

// ─── POST /api/admin/broadcast ────────────────────────────────────────────────

describe('POST /api/admin/broadcast', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue(UNAUTHED)
    const res = await POST(makeReq({ audience: 'ALL', subject: 'Hi', body: 'Hello' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when audience is invalid', async () => {
    const res  = await POST(makeReq({ audience: 'BOGUS', subject: 'Hi', body: 'Hello' }))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/audience/i)
  })

  it('returns 400 when subject is missing', async () => {
    const res  = await POST(makeReq({ audience: 'ALL', body: 'Hello' }))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/subject/i)
  })

  it('returns 400 when body is missing', async () => {
    const res  = await POST(makeReq({ audience: 'ALL', subject: 'Hi' }))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/body/i)
  })

  it('returns recipient count for preview mode', async () => {
    mockUserFindMany.mockResolvedValue([
      { email: 'a@test.com', name: 'Alice' },
      { email: 'b@test.com', name: 'Bob'   },
    ])
    const res  = await POST(makeReq({ audience: 'ALL', subject: 'Hi', body: 'Hello', preview: true }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.count).toBe(2)
    // No emails sent in preview mode
    expect(mockBatchSend).not.toHaveBeenCalled()
  })

  it('returns { sent: 0, failed: 0 } when audience is empty', async () => {
    mockUserFindMany.mockResolvedValue([])
    const res  = await POST(makeReq({ audience: 'SUBSCRIBERS', subject: 'Hi', body: 'Hello', preview: false }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toEqual({ sent: 0, failed: 0 })
    expect(mockBatchSend).not.toHaveBeenCalled()
  })

  it('sends emails and returns { sent, failed } for actual send', async () => {
    mockUserFindMany.mockResolvedValue([
      { email: 'a@test.com', name: 'Alice' },
      { email: 'b@test.com', name: 'Bob'   },
    ])
    mockBatchSend.mockResolvedValue({ data: true, error: null })
    const res  = await POST(makeReq({ audience: 'ALL', subject: 'Hi', body: 'Hello', preview: false }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.sent).toBe(2)
    expect(json.failed).toBe(0)
  })
})
