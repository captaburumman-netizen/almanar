/**
 * Unit tests — src/lib/adminGuard.ts
 *
 * Covers: requireAdminSession — all three outcomes:
 *   • No session        → 401 Unauthorized
 *   • Session, not ADMIN → 403 Forbidden
 *   • Session, ADMIN    → { session, error: null }
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerSession = jest.fn()

jest.mock('next-auth', () => ({
  getServerSession: (...a: unknown[]) => mockGetServerSession(...a),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

// ─── Import ───────────────────────────────────────────────────────────────────

import { requireAdminSession } from '@/lib/adminGuard'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ADMIN_SESSION  = { user: { id: 'admin-1', role: 'ADMIN' } }
const USER_SESSION   = { user: { id: 'user-1',  role: 'USER'  } }

beforeEach(() => jest.clearAllMocks())

// ═══════════════════════════════════════════════════════════════════════════════
// requireAdminSession
// ═══════════════════════════════════════════════════════════════════════════════

describe('requireAdminSession', () => {
  // ── Unauthenticated ──────────────────────────────────────────────────────────

  it('returns a 401 error response when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const { session, error } = await requireAdminSession()
    expect(session).toBeNull()
    expect(error).not.toBeNull()
    expect(error!.status).toBe(401)
  })

  it('401 response body contains an "Unauthorized" error message', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const { error } = await requireAdminSession()
    const body = await error!.json() as { error: string }
    expect(body.error).toMatch(/unauthorized/i)
  })

  it('returns a 401 when session exists but user.id is missing', async () => {
    mockGetServerSession.mockResolvedValue({ user: {} })
    const { error } = await requireAdminSession()
    expect(error!.status).toBe(401)
  })

  // ── Non-admin user ───────────────────────────────────────────────────────────

  it('returns a 403 error response when the user is not ADMIN', async () => {
    mockGetServerSession.mockResolvedValue(USER_SESSION)
    const { session, error } = await requireAdminSession()
    expect(session).toBeNull()
    expect(error!.status).toBe(403)
  })

  it('403 response body contains a "Forbidden" error message', async () => {
    mockGetServerSession.mockResolvedValue(USER_SESSION)
    const { error } = await requireAdminSession()
    const body = await error!.json() as { error: string }
    expect(body.error).toMatch(/forbidden/i)
  })

  // ── Admin user ───────────────────────────────────────────────────────────────

  it('returns the session and null error for an ADMIN user', async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION)
    const { session, error } = await requireAdminSession()
    expect(error).toBeNull()
    expect(session).toBe(ADMIN_SESSION)
  })

  it('returns the complete session object untouched', async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION)
    const { session } = await requireAdminSession()
    expect(session?.user.id).toBe('admin-1')
    expect(session?.user.role).toBe('ADMIN')
  })
})
