/**
 * Unit tests for auth API routes.
 *
 * All external dependencies (Prisma, bcrypt, Resend) are mocked so
 * tests run without a real database or network.
 */

import { NextRequest } from 'next/server'

// ─── Mock setup ───────────────────────────────────────────────────────────────
// Declare mocks at module scope so they are captured by the jest.mock factories.
// Jest hoists jest.mock() calls above imports, but the factory is evaluated
// lazily (on first import), so all const values below are already assigned.

const mockUserFindUnique  = jest.fn()
const mockUserCreate      = jest.fn()
const mockUserUpdate      = jest.fn()
const mockTokenFindUnique = jest.fn()
const mockTokenCreate     = jest.fn()
const mockTokenDelete     = jest.fn()
const mockTokenDeleteMany = jest.fn()
const mockTransaction     = jest.fn()
const mockSendEmail       = jest.fn().mockResolvedValue(true)

jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      create:     (...a: unknown[]) => mockUserCreate(...a),
      update:     (...a: unknown[]) => mockUserUpdate(...a),
    },
    passwordResetToken: {
      findUnique: (...a: unknown[]) => mockTokenFindUnique(...a),
      create:     (...a: unknown[]) => mockTokenCreate(...a),
      delete:     (...a: unknown[]) => mockTokenDelete(...a),
      deleteMany: (...a: unknown[]) => mockTokenDeleteMany(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}))

jest.mock('@/lib/resend', () => ({
  sendEmail:        (...a: unknown[]) => mockSendEmail(...a),
  addToMailingList: jest.fn().mockResolvedValue(undefined),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, path = '/api/auth/register'): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

// Reset all mock call history + return-value queues before each test
beforeEach(() => {
  jest.resetAllMocks()
  // Re-apply the default sendEmail implementation (resetAllMocks clears it)
  mockSendEmail.mockResolvedValue(true)
})

// ─── Register route ───────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: (req: NextRequest) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/auth/register/route')
    POST = mod.POST
  })

  it('returns 400 for invalid input (missing name)', async () => {
    const req = makeRequest({ email: 'a@b.com', password: 'password123' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it('returns 409 when email already exists', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: 'existing-id' })
    const req = makeRequest({ name: 'Test', email: 'taken@example.com', password: 'password123', locale: 'en' })
    const res = await POST(req)
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it('returns 201 and creates a user for valid input', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null)
    mockUserCreate.mockResolvedValueOnce({ id: 'new-id', email: 'new@example.com', name: 'Test User' })

    const req = makeRequest({ name: 'Test User', email: 'new@example.com', password: 'password123', locale: 'en' })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.email).toBe('new@example.com')
  })

  it('normalises email to lowercase before lookup', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null)
    mockUserCreate.mockResolvedValueOnce({ id: 'x', email: 'upper@example.com', name: 'Uppercase User' })

    const req = makeRequest({ name: 'Uppercase User', email: 'UPPER@EXAMPLE.COM', password: 'password123', locale: 'ar' })
    await POST(req)

    expect(mockUserFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'upper@example.com' } })
    )
  })
})

// ─── Forgot-password route ────────────────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: (req: NextRequest) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/auth/forgot-password/route')
    POST = mod.POST
  })

  it('returns 200 even when email does not exist (prevents enumeration)', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null)
    const req = makeRequest({ email: 'ghost@example.com' }, '/api/auth/forgot-password')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('returns 200 and creates a token when user exists', async () => {
    mockUserFindUnique.mockResolvedValueOnce({
      id: 'user-1', email: 'real@example.com', name: 'Real User', preferredLocale: 'en',
    })
    mockTokenDeleteMany.mockResolvedValueOnce({ count: 0 })
    mockTokenCreate.mockResolvedValueOnce({ id: 'token-1' })

    const req = makeRequest({ email: 'real@example.com' }, '/api/auth/forgot-password')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockTokenCreate).toHaveBeenCalledTimes(1)
  })

  it('returns 400 for invalid email format', async () => {
    const req = makeRequest({ email: 'not-an-email' }, '/api/auth/forgot-password')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ─── Reset-password route ─────────────────────────────────────────────────────

describe('POST /api/auth/reset-password', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: (req: NextRequest) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/auth/reset-password/route')
    POST = mod.POST
  })

  it('returns 400 when token does not exist', async () => {
    mockTokenFindUnique.mockResolvedValueOnce(null)
    const req = makeRequest({ token: 'bad-token', password: 'newpassword', confirm: 'newpassword' }, '/api/auth/reset-password')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when token is expired', async () => {
    mockTokenFindUnique.mockResolvedValueOnce({
      id: 'token-1', userId: 'user-1',
      expires: new Date(Date.now() - 1000), // expired
    })
    mockTokenDelete.mockResolvedValueOnce({})

    const req = makeRequest({ token: 'expired', password: 'newpassword', confirm: 'newpassword' }, '/api/auth/reset-password')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 and updates password for valid token', async () => {
    mockTokenFindUnique.mockResolvedValueOnce({
      id: 'token-1', userId: 'user-1',
      expires: new Date(Date.now() + 60_000), // valid
    })
    mockTransaction.mockResolvedValueOnce([{}, {}])

    const req = makeRequest({ token: 'valid-token', password: 'newpassword', confirm: 'newpassword' }, '/api/auth/reset-password')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('returns 400 when passwords do not match', async () => {
    const req = makeRequest({ token: 'x', password: 'password1', confirm: 'password2' }, '/api/auth/reset-password')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ─── Validation schemas ───────────────────────────────────────────────────────

describe('registerSchema', () => {
  let registerSchema: typeof import('@/lib/validations').registerSchema

  beforeAll(async () => {
    const mod = await import('@/lib/validations')
    registerSchema = mod.registerSchema
  })

  it('rejects passwords shorter than 8 characters', () => {
    const r = registerSchema.safeParse({ name: 'Ali', email: 'a@b.com', password: 'short', locale: 'ar' })
    expect(r.success).toBe(false)
  })

  it('rejects names shorter than 2 characters', () => {
    const r = registerSchema.safeParse({ name: 'A', email: 'a@b.com', password: 'password123', locale: 'ar' })
    expect(r.success).toBe(false)
  })

  it('defaults locale to ar when omitted', () => {
    const r = registerSchema.safeParse({ name: 'Ali', email: 'a@b.com', password: 'password123' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.locale).toBe('ar')
  })

  it('accepts valid en locale', () => {
    const r = registerSchema.safeParse({ name: 'Ali', email: 'a@b.com', password: 'password123', locale: 'en' })
    expect(r.success).toBe(true)
  })
})
