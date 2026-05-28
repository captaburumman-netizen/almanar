/**
 * Unit tests — src/lib/broadcast.ts
 *
 * Covers: getAudienceRecipients (all four segments + invalid segment),
 *         sendBroadcast (batch chunking, success counting, failure handling).
 *
 * Prisma and the Resend class are mocked.
 */

// ─── Mock: Prisma ─────────────────────────────────────────────────────────────

const mockUserFindMany = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findMany: (...a: unknown[]) => mockUserFindMany(...a),
    },
  },
}))

// ─── Mock: Resend ─────────────────────────────────────────────────────────────

const mockBatchSend = jest.fn()

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    batch: { send: (...a: unknown[]) => mockBatchSend(...a) },
  })),
}))

// ─── Mock: BroadcastEmail component ──────────────────────────────────────────

jest.mock('@/emails/BroadcastEmail', () => ({
  BroadcastEmail: () => null,
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  getAudienceRecipients,
  sendBroadcast,
  type AudienceType,
} from '@/lib/broadcast'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const RECIPIENTS = [
  { email: 'alice@test.com', name: 'Alice Smith' },
  { email: 'bob@test.com',   name: 'Bob Jones'   },
]

beforeEach(() => {
  jest.clearAllMocks()
  mockUserFindMany.mockResolvedValue([])
  mockBatchSend.mockResolvedValue({ data: { results: [] }, error: null })
})

// ═══════════════════════════════════════════════════════════════════════════════
// getAudienceRecipients — ALL
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAudienceRecipients — ALL', () => {
  it('queries users with non-empty email', async () => {
    await getAudienceRecipients('ALL')
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ email: { not: '' } }),
      }),
    )
  })

  it('applies a take limit (MAX_RECIPIENTS = 1000)', async () => {
    await getAudienceRecipients('ALL')
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1000 }),
    )
  })

  it('orders by createdAt ascending', async () => {
    await getAudienceRecipients('ALL')
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
    )
  })

  it('returns the array from the DB', async () => {
    mockUserFindMany.mockResolvedValue(RECIPIENTS)
    const result = await getAudienceRecipients('ALL')
    expect(result).toEqual(RECIPIENTS)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// getAudienceRecipients — SUBSCRIBERS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAudienceRecipients — SUBSCRIBERS', () => {
  it('filters by active subscription status', async () => {
    await getAudienceRecipients('SUBSCRIBERS')
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { subscription: { status: 'ACTIVE' } },
      }),
    )
  })

  it('returns the array from the DB', async () => {
    mockUserFindMany.mockResolvedValue(RECIPIENTS)
    const result = await getAudienceRecipients('SUBSCRIBERS')
    expect(result).toEqual(RECIPIENTS)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// getAudienceRecipients — ENROLLEES
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAudienceRecipients — ENROLLEES', () => {
  it('filters for users who have at least one enrollment', async () => {
    await getAudienceRecipients('ENROLLEES')
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { enrollments: { some: {} } },
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// getAudienceRecipients — PURCHASERS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAudienceRecipients — PURCHASERS', () => {
  it('filters for users with at least one COMPLETED product purchase', async () => {
    await getAudienceRecipients('PURCHASERS')
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productPurchases: { some: { status: 'COMPLETED' } } },
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// getAudienceRecipients — invalid segment
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAudienceRecipients — invalid segment', () => {
  it('returns an empty array for an unrecognised audience type', async () => {
    const result = await getAudienceRecipients('UNKNOWN' as AudienceType)
    expect(result).toEqual([])
    expect(mockUserFindMany).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// sendBroadcast
// ═══════════════════════════════════════════════════════════════════════════════

describe('sendBroadcast', () => {
  const OPTS = {
    recipients: RECIPIENTS,
    subject:    'Test Subject',
    body:       'Hello!\n\nThis is the body.',
  }

  it('returns { sent, failed } counts', async () => {
    const result = await sendBroadcast(OPTS)
    expect(typeof result.sent).toBe('number')
    expect(typeof result.failed).toBe('number')
  })

  it('returns sent = recipients.length when batch succeeds', async () => {
    const result = await sendBroadcast(OPTS)
    expect(result.sent).toBe(2)
    expect(result.failed).toBe(0)
  })

  it('returns failed = recipients.length when batch.send returns an error', async () => {
    mockBatchSend.mockResolvedValue({ data: null, error: 'rate limit exceeded' })
    const result = await sendBroadcast(OPTS)
    expect(result.sent).toBe(0)
    expect(result.failed).toBe(2)
  })

  it('returns failed = recipients.length when batch.send throws', async () => {
    mockBatchSend.mockRejectedValue(new Error('Network error'))
    const result = await sendBroadcast(OPTS)
    expect(result.sent).toBe(0)
    expect(result.failed).toBe(2)
  })

  it('returns { sent: 0, failed: 0 } for an empty recipients list', async () => {
    const result = await sendBroadcast({ ...OPTS, recipients: [] })
    expect(result.sent).toBe(0)
    expect(result.failed).toBe(0)
    expect(mockBatchSend).not.toHaveBeenCalled()
  })

  it('chunks 150 recipients into 2 batches (100 + 50)', async () => {
    const big = Array.from({ length: 150 }, (_, i) => ({
      email: `user${i}@test.com`,
      name:  `User ${i}`,
    }))
    const result = await sendBroadcast({ ...OPTS, recipients: big })
    // Two calls to batch.send
    expect(mockBatchSend).toHaveBeenCalledTimes(2)
    // First batch = 100 emails, second = 50
    const firstCallEmails  = (mockBatchSend.mock.calls[0]![0] as unknown[]).length
    const secondCallEmails = (mockBatchSend.mock.calls[1]![0] as unknown[]).length
    expect(firstCallEmails).toBe(100)
    expect(secondCallEmails).toBe(50)
    expect(result.sent).toBe(150)
  })

  it('counts sent and failed independently across batches', async () => {
    // First batch succeeds, second fails
    const big = Array.from({ length: 150 }, (_, i) => ({
      email: `user${i}@test.com`,
      name:  null,
    }))
    mockBatchSend
      .mockResolvedValueOnce({ data: { results: [] }, error: null })  // first batch ok
      .mockResolvedValueOnce({ data: null, error: 'quota exceeded' }) // second batch fail

    const result = await sendBroadcast({ ...OPTS, recipients: big })
    expect(result.sent).toBe(100)
    expect(result.failed).toBe(50)
  })

  it('each email in the batch is addressed to the recipient', async () => {
    await sendBroadcast({ ...OPTS, recipients: [RECIPIENTS[0]!] })
    const emailsArg = mockBatchSend.mock.calls[0]![0] as Array<{ to: string }>
    expect(emailsArg[0]!.to).toBe('alice@test.com')
  })

  it('uses the provided subject for all emails', async () => {
    await sendBroadcast(OPTS)
    const emailsArg = mockBatchSend.mock.calls[0]![0] as Array<{ subject: string }>
    expect(emailsArg[0]!.subject).toBe('Test Subject')
  })
})
