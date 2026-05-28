/**
 * Unit tests for user account API routes.
 *
 * Covers:
 *   PATCH /api/user/profile  — update display name
 *   POST  /api/user/password — change password (credential accounts only)
 *   PATCH /api/user/locale   — update preferred email language
 */

import { NextRequest } from 'next/server'

// ─── Mock: next-auth ─────────────────────────────────────────────────────────

const mockGetServerSession = jest.fn()
jest.mock('next-auth', () => ({
  getServerSession: (...a: unknown[]) => mockGetServerSession(...a),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

// ─── Mock: bcryptjs ───────────────────────────────────────────────────────────

const mockBcryptCompare = jest.fn()
const mockBcryptHash    = jest.fn()

jest.mock('bcryptjs', () => ({
  compare: (...a: unknown[]) => mockBcryptCompare(...a),
  hash:    (...a: unknown[]) => mockBcryptHash(...a),
}))

// ─── Mock: Prisma ─────────────────────────────────────────────────────────────

const mockUserFindUnique = jest.fn()
const mockUserUpdate     = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      update:     (...a: unknown[]) => mockUserUpdate(...a),
    },
  },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AUTH_SESSION = { user: { id: 'user-1', email: 'test@test.com' } }

function makeReq(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body ?? {}),
  })
}

// ─── Dynamic imports ──────────────────────────────────────────────────────────

let patchProfile:  (req: NextRequest) => Promise<Response>
let postPassword:  (req: NextRequest) => Promise<Response>
let patchLocale:   (req: NextRequest) => Promise<Response>

beforeAll(async () => {
  const profileRoute  = await import('@/app/api/user/profile/route')
  const passwordRoute = await import('@/app/api/user/password/route')
  const localeRoute   = await import('@/app/api/user/locale/route')

  patchProfile  = profileRoute.PATCH
  postPassword  = passwordRoute.POST
  patchLocale   = localeRoute.PATCH
})

beforeEach(() => {
  jest.clearAllMocks()
  mockGetServerSession.mockResolvedValue(AUTH_SESSION)
})

// ─── PATCH /api/user/profile ──────────────────────────────────────────────────

describe('PATCH /api/user/profile', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await patchProfile(makeReq('/api/user/profile', 'PATCH', { name: 'Alice' }))
    expect(res.status).toBe(401)
  })

  it('returns 422 when name is too short', async () => {
    const res = await patchProfile(makeReq('/api/user/profile', 'PATCH', { name: 'A' }))
    expect(res.status).toBe(422)
  })

  it('returns 422 when name is too long (>60 chars)', async () => {
    const res = await patchProfile(makeReq('/api/user/profile', 'PATCH', { name: 'A'.repeat(61) }))
    expect(res.status).toBe(422)
  })

  it('returns 422 when name is missing', async () => {
    const res = await patchProfile(makeReq('/api/user/profile', 'PATCH', {}))
    expect(res.status).toBe(422)
  })

  it('updates name and returns 200 with the new name', async () => {
    mockUserUpdate.mockResolvedValue({ name: 'Alice Smith' })
    const res  = await patchProfile(makeReq('/api/user/profile', 'PATCH', { name: 'Alice Smith' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.name).toBe('Alice Smith')
  })

  it('calls db.user.update with correct userId and name', async () => {
    mockUserUpdate.mockResolvedValue({ name: 'Bob' })
    await patchProfile(makeReq('/api/user/profile', 'PATCH', { name: 'Bob' }))
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data:  { name: 'Bob' },
      }),
    )
  })
})

// ─── POST /api/user/password ──────────────────────────────────────────────────

describe('POST /api/user/password', () => {
  const VALID_BODY = { currentPassword: 'oldpass123', newPassword: 'NewSecure!1' }

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await postPassword(makeReq('/api/user/password', 'POST', VALID_BODY))
    expect(res.status).toBe(401)
  })

  it('returns 400 when user has no password (OAuth account)', async () => {
    mockUserFindUnique.mockResolvedValue({ password: null })
    const res = await postPassword(makeReq('/api/user/password', 'POST', VALID_BODY))
    expect(res.status).toBe(400)
  })

  it('returns 422 when newPassword is too short', async () => {
    mockUserFindUnique.mockResolvedValue({ password: 'hashed' })
    mockBcryptCompare.mockResolvedValue(true)
    const res = await postPassword(makeReq('/api/user/password', 'POST', {
      currentPassword: 'oldpass123',
      newPassword:     'abc',
    }))
    expect(res.status).toBe(422)
  })

  it('returns 401 when currentPassword is wrong', async () => {
    mockUserFindUnique.mockResolvedValue({ password: 'hashed' })
    mockBcryptCompare.mockResolvedValue(false)
    const res = await postPassword(makeReq('/api/user/password', 'POST', VALID_BODY))
    expect(res.status).toBe(401)
  })

  it('returns 200 and ok:true on successful password change', async () => {
    mockUserFindUnique.mockResolvedValue({ password: 'hashed' })
    mockBcryptCompare.mockResolvedValue(true)
    mockBcryptHash.mockResolvedValue('newhashed')
    mockUserUpdate.mockResolvedValue({})
    const res  = await postPassword(makeReq('/api/user/password', 'POST', VALID_BODY))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })

  it('hashes the new password and saves it', async () => {
    mockUserFindUnique.mockResolvedValue({ password: 'hashed' })
    mockBcryptCompare.mockResolvedValue(true)
    mockBcryptHash.mockResolvedValue('newhashed')
    mockUserUpdate.mockResolvedValue({})
    await postPassword(makeReq('/api/user/password', 'POST', VALID_BODY))
    expect(mockBcryptHash).toHaveBeenCalledWith('NewSecure!1', expect.any(Number))
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data:  { password: 'newhashed' },
      }),
    )
  })
})

// ─── PATCH /api/user/locale ───────────────────────────────────────────────────

describe('PATCH /api/user/locale', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await patchLocale(makeReq('/api/user/locale', 'PATCH', { locale: 'ar' }))
    expect(res.status).toBe(401)
  })

  it('returns 422 for an invalid locale', async () => {
    const res = await patchLocale(makeReq('/api/user/locale', 'PATCH', { locale: 'fr' }))
    expect(res.status).toBe(422)
  })

  it('returns 422 when locale is missing', async () => {
    const res = await patchLocale(makeReq('/api/user/locale', 'PATCH', {}))
    expect(res.status).toBe(422)
  })

  it('updates to "ar" and returns 200 with the locale', async () => {
    mockUserUpdate.mockResolvedValue({ preferredLocale: 'ar' })
    const res  = await patchLocale(makeReq('/api/user/locale', 'PATCH', { locale: 'ar' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.locale).toBe('ar')
  })

  it('updates to "en" and returns 200 with the locale', async () => {
    mockUserUpdate.mockResolvedValue({ preferredLocale: 'en' })
    const res  = await patchLocale(makeReq('/api/user/locale', 'PATCH', { locale: 'en' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.locale).toBe('en')
  })

  it('calls db.user.update with correct userId and locale', async () => {
    mockUserUpdate.mockResolvedValue({ preferredLocale: 'en' })
    await patchLocale(makeReq('/api/user/locale', 'PATCH', { locale: 'en' }))
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data:  { preferredLocale: 'en' },
      }),
    )
  })
})
