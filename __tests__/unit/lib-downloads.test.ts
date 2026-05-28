/**
 * Unit tests — src/lib/downloads.ts
 *
 * Covers: createDownloadToken (DB call, expiry, maxDownloads) and
 *         buildDownloadLink (URL construction, env fallback).
 *
 * Clock is pinned with fake timers so expiresAt calculations are deterministic.
 */

// ─── Mock: Prisma ─────────────────────────────────────────────────────────────

const mockDownloadCreate = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    download: {
      create: (...a: unknown[]) => mockDownloadCreate(...a),
    },
  },
}))

// ─── Mock: S3 constants ───────────────────────────────────────────────────────

jest.mock('@/lib/s3', () => ({
  DOWNLOAD_TTL_HOURS:          48,
  DOWNLOAD_MAX_REGENERATIONS:  5,
}))

// ─── Fixed clock ──────────────────────────────────────────────────────────────

const FIXED_NOW = 1_718_000_000_000   // arbitrary epoch ms

beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(FIXED_NOW)
})

afterAll(() => {
  jest.useRealTimers()
})

// ─── Imports ──────────────────────────────────────────────────────────────────

import { createDownloadToken, buildDownloadLink } from '@/lib/downloads'

// ─── Fixture ──────────────────────────────────────────────────────────────────

const MOCK_DOWNLOAD = {
  id:            'dl-1',
  token:         'tok-abc',
  userId:        'user-1',
  purchaseId:    'purchase-1',
  productId:     'product-1',
  expiresAt:     new Date(FIXED_NOW + 48 * 60 * 60 * 1000),
  maxDownloads:  5,
  downloadCount: 0,
  createdAt:     new Date(FIXED_NOW),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockDownloadCreate.mockResolvedValue(MOCK_DOWNLOAD)
})

// ═══════════════════════════════════════════════════════════════════════════════
// createDownloadToken
// ═══════════════════════════════════════════════════════════════════════════════

describe('createDownloadToken', () => {
  it('calls db.download.create with userId, purchaseId, and productId', async () => {
    await createDownloadToken('user-1', 'purchase-1', 'product-1')
    expect(mockDownloadCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId:    'user-1',
        purchaseId: 'purchase-1',
        productId:  'product-1',
      }),
    })
  })

  it('sets maxDownloads to DOWNLOAD_MAX_REGENERATIONS (5)', async () => {
    await createDownloadToken('u', 'p', 'pr')
    expect(mockDownloadCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ maxDownloads: 5 }),
    })
  })

  it('sets expiresAt to now + 48 hours', async () => {
    await createDownloadToken('u', 'p', 'pr')
    const expected = new Date(FIXED_NOW + 48 * 60 * 60 * 1000)
    expect(mockDownloadCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ expiresAt: expected }),
    })
  })

  it('returns the created download record from Prisma', async () => {
    const result = await createDownloadToken('user-1', 'purchase-1', 'product-1')
    expect(result).toMatchObject({ id: 'dl-1', token: 'tok-abc' })
  })

  it('calls create exactly once per invocation', async () => {
    await createDownloadToken('u', 'p', 'pr')
    expect(mockDownloadCreate).toHaveBeenCalledTimes(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// buildDownloadLink
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildDownloadLink', () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalEnv
  })

  it('builds the URL using NEXT_PUBLIC_APP_URL when set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.almanar.co'
    expect(buildDownloadLink('tok-abc')).toBe(
      'https://app.almanar.co/api/downloads/tok-abc',
    )
  })

  it('falls back to http://localhost:3000 when env var is unset', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(buildDownloadLink('tok-xyz')).toBe(
      'http://localhost:3000/api/downloads/tok-xyz',
    )
  })

  it('embeds the token exactly as provided', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://almanar.co'
    const token = 'clxyz0abc123'
    expect(buildDownloadLink(token)).toContain(token)
  })

  it('always includes the /api/downloads/ path prefix', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://almanar.co'
    expect(buildDownloadLink('any-token')).toContain('/api/downloads/')
  })
})
