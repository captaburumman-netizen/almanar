/**
 * Unit tests — src/lib/resend.ts
 *
 * Covers: sendEmail (success, Resend error, exception, multiple recipients,
 *         replyTo), addToMailingList (early-return when audience ID is empty,
 *         non-fatal on contacts.create failure), EMAIL_FROM shape.
 *
 * The Resend class is mocked so no real API calls are made.
 */

// ─── Mock: Resend ─────────────────────────────────────────────────────────────

const mockEmailsSend    = jest.fn()
const mockContactsCreate = jest.fn()

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails:   { send:   (...a: unknown[]) => mockEmailsSend(...a)    },
    contacts: { create: (...a: unknown[]) => mockContactsCreate(...a) },
  })),
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import * as React from 'react'
import {
  sendEmail,
  addToMailingList,
  EMAIL_FROM,
  RESEND_AUDIENCE_ID,
} from '@/lib/resend'

// ─── Shared fixture ───────────────────────────────────────────────────────────

// A minimal React element — Resend receives it but we never render it
const MOCK_ELEMENT = React.createElement('div', null, 'email body')

const BASE_OPTS = {
  to:      'alice@test.com',
  subject: 'Test Subject',
  react:   MOCK_ELEMENT,
}

beforeEach(() => {
  jest.clearAllMocks()
  // Default: Resend responds with success
  mockEmailsSend.mockResolvedValue({ data: { id: 'email-abc' }, error: null })
  mockContactsCreate.mockResolvedValue({ data: {}, error: null })
})

// ═══════════════════════════════════════════════════════════════════════════════
// sendEmail
// ═══════════════════════════════════════════════════════════════════════════════

describe('sendEmail', () => {
  it('returns true when Resend sends successfully', async () => {
    expect(await sendEmail(BASE_OPTS)).toBe(true)
  })

  it('returns false when Resend returns an error object', async () => {
    mockEmailsSend.mockResolvedValue({ data: null, error: { message: 'Rate limited' } })
    expect(await sendEmail(BASE_OPTS)).toBe(false)
  })

  it('returns false when Resend throws (network failure etc.)', async () => {
    mockEmailsSend.mockRejectedValue(new Error('Network timeout'))
    expect(await sendEmail(BASE_OPTS)).toBe(false)
  })

  it('never throws — always resolves to a boolean', async () => {
    mockEmailsSend.mockRejectedValue(new TypeError('crash'))
    await expect(sendEmail(BASE_OPTS)).resolves.toBe(false)
  })

  it('passes the subject to Resend', async () => {
    await sendEmail(BASE_OPTS)
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Test Subject' }),
    )
  })

  it('passes the to address to Resend', async () => {
    await sendEmail(BASE_OPTS)
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'alice@test.com' }),
    )
  })

  it('accepts an array of recipients', async () => {
    const to = ['a@test.com', 'b@test.com']
    await sendEmail({ ...BASE_OPTS, to })
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ to }),
    )
  })

  it('includes replyTo when provided', async () => {
    await sendEmail({ ...BASE_OPTS, replyTo: 'support@almanar.co' })
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: 'support@almanar.co' }),
    )
  })

  it('includes the EMAIL_FROM address in every send call', async () => {
    await sendEmail(BASE_OPTS)
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: EMAIL_FROM }),
    )
  })

  it('calls emails.send exactly once per invocation', async () => {
    await sendEmail(BASE_OPTS)
    expect(mockEmailsSend).toHaveBeenCalledTimes(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// addToMailingList
// ═══════════════════════════════════════════════════════════════════════════════

describe('addToMailingList', () => {
  it('skips contacts.create when RESEND_AUDIENCE_ID is empty (no-op)', async () => {
    // In the test environment RESEND_AUDIENCE_ID defaults to '' (env var not set)
    await addToMailingList('user@test.com', 'Alice')
    expect(mockContactsCreate).not.toHaveBeenCalled()
  })

  it('resolves to undefined (void return) regardless of audience ID state', async () => {
    const result = await addToMailingList('user@test.com')
    expect(result).toBeUndefined()
  })

  it('does not throw when contacts.create fails — non-fatal', async () => {
    // Even if somehow contacts.create were called and failed, it must not throw
    mockContactsCreate.mockRejectedValue(new Error('contacts API down'))
    await expect(addToMailingList('user@test.com', 'Alice')).resolves.toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL_FROM — constant shape
// ═══════════════════════════════════════════════════════════════════════════════

describe('EMAIL_FROM', () => {
  it('is a non-empty string', () => {
    expect(typeof EMAIL_FROM).toBe('string')
    expect(EMAIL_FROM.length).toBeGreaterThan(0)
  })

  it('contains an email address in angle-bracket format', () => {
    // e.g. "ALMANAR <noreply@almanar.com>"
    expect(EMAIL_FROM).toMatch(/<[^@]+@[^>]+>/)
  })

  it('includes the sender name before the angle-bracketed address', () => {
    // Format: "Name <email@domain.com>"
    expect(EMAIL_FROM).toMatch(/^.+ </)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// RESEND_AUDIENCE_ID — env fallback
// ═══════════════════════════════════════════════════════════════════════════════

describe('RESEND_AUDIENCE_ID', () => {
  it('is a string', () => {
    expect(typeof RESEND_AUDIENCE_ID).toBe('string')
  })

  it('defaults to an empty string when the env var is not set', () => {
    // Jest test environment has no RESEND_AUDIENCE_ID set
    expect(RESEND_AUDIENCE_ID).toBe('')
  })
})
