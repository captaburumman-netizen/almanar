/**
 * Unit tests — src/lib/session.ts
 *
 * Covers: requireAuth, requireAdmin, getOptionalSession, redirectIfAuthed.
 *
 * next/navigation redirect() throws a special error in Next.js; we replicate
 * that behaviour here so tests can use .rejects to verify the redirect target
 * without the function trying to continue past it.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerSession = jest.fn()
const mockRedirect         = jest.fn()

jest.mock('next-auth', () => ({
  getServerSession: (...a: unknown[]) => mockGetServerSession(...a),
}))

jest.mock('@/lib/auth', () => ({ authOptions: {} }))

// Simulate Next.js redirect() — it throws so execution stops, matching
// real framework behaviour.
jest.mock('next/navigation', () => ({
  redirect: (path: string) => {
    mockRedirect(path)
    throw new Error(`NEXT_REDIRECT:${path}`)
  },
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  requireAuth,
  requireAdmin,
  getOptionalSession,
  redirectIfAuthed,
} from '@/lib/session'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_SESSION  = { user: { id: 'u1', role: 'USER',  email: 'u@test.com' } }
const ADMIN_SESSION = { user: { id: 'a1', role: 'ADMIN', email: 'a@test.com' } }

beforeEach(() => {
  jest.clearAllMocks()
})

// ═══════════════════════════════════════════════════════════════════════════════
// requireAuth
// ═══════════════════════════════════════════════════════════════════════════════

describe('requireAuth', () => {
  it('returns the session when the user is authenticated', async () => {
    mockGetServerSession.mockResolvedValue(USER_SESSION)
    const session = await requireAuth('en')
    expect(session).toBe(USER_SESSION)
  })

  it('redirects to /${locale}/auth/signin when session is null', async () => {
    mockGetServerSession.mockResolvedValue(null)
    await expect(requireAuth('en')).rejects.toThrow('NEXT_REDIRECT:/en/auth/signin')
    expect(mockRedirect).toHaveBeenCalledWith('/en/auth/signin')
  })

  it('uses the correct locale in the redirect path', async () => {
    mockGetServerSession.mockResolvedValue(null)
    await expect(requireAuth('ar')).rejects.toThrow('NEXT_REDIRECT:/ar/auth/signin')
    expect(mockRedirect).toHaveBeenCalledWith('/ar/auth/signin')
  })

  it('does not call redirect when the session exists', async () => {
    mockGetServerSession.mockResolvedValue(USER_SESSION)
    await requireAuth('en')
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// requireAdmin
// ═══════════════════════════════════════════════════════════════════════════════

describe('requireAdmin', () => {
  it('returns the session when the user is ADMIN', async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION)
    const session = await requireAdmin('en')
    expect(session).toBe(ADMIN_SESSION)
  })

  it('redirects to /${locale}/dashboard when the user is not ADMIN', async () => {
    mockGetServerSession.mockResolvedValue(USER_SESSION)
    await expect(requireAdmin('en')).rejects.toThrow('NEXT_REDIRECT:/en/dashboard')
    expect(mockRedirect).toHaveBeenCalledWith('/en/dashboard')
  })

  it('uses the correct locale in the dashboard redirect', async () => {
    mockGetServerSession.mockResolvedValue(USER_SESSION)
    await expect(requireAdmin('ar')).rejects.toThrow('NEXT_REDIRECT:/ar/dashboard')
  })

  it('redirects to sign-in when there is no session at all', async () => {
    mockGetServerSession.mockResolvedValue(null)
    await expect(requireAdmin('en')).rejects.toThrow('NEXT_REDIRECT:/en/auth/signin')
  })

  it('does not call redirect when the user is ADMIN', async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION)
    await requireAdmin('en')
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// getOptionalSession
// ═══════════════════════════════════════════════════════════════════════════════

describe('getOptionalSession', () => {
  it('returns the session when the user is authenticated', async () => {
    mockGetServerSession.mockResolvedValue(USER_SESSION)
    const session = await getOptionalSession()
    expect(session).toBe(USER_SESSION)
  })

  it('returns null when no session exists', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const session = await getOptionalSession()
    expect(session).toBeNull()
  })

  it('never calls redirect regardless of auth state', async () => {
    mockGetServerSession.mockResolvedValue(null)
    await getOptionalSession()
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// redirectIfAuthed
// ═══════════════════════════════════════════════════════════════════════════════

describe('redirectIfAuthed', () => {
  it('redirects to /${locale}/dashboard when already authenticated', async () => {
    mockGetServerSession.mockResolvedValue(USER_SESSION)
    await expect(redirectIfAuthed('en')).rejects.toThrow('NEXT_REDIRECT:/en/dashboard')
    expect(mockRedirect).toHaveBeenCalledWith('/en/dashboard')
  })

  it('uses the correct locale in the redirect path', async () => {
    mockGetServerSession.mockResolvedValue(USER_SESSION)
    await expect(redirectIfAuthed('ar')).rejects.toThrow('NEXT_REDIRECT:/ar/dashboard')
  })

  it('does NOT redirect when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)
    await redirectIfAuthed('en')
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('resolves to undefined when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const result = await redirectIfAuthed('en')
    expect(result).toBeUndefined()
  })
})
