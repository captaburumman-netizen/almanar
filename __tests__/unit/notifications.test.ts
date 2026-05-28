/**
 * Unit tests for the Notifications system.
 *
 * Covers:
 *   lib/notifications  — createNotification, getUnreadCount,
 *                        listNotifications, markRead, markAllRead
 *   GET  /api/notifications
 *   PATCH /api/notifications/[id]
 *   POST  /api/notifications/read-all
 */

import { NextRequest } from 'next/server'

/* ─── mock: next-auth ────────────────────────────────────────────────────── */
const mockGetServerSession = jest.fn()
jest.mock('next-auth', () => ({
  getServerSession: (...a: unknown[]) => mockGetServerSession(...a),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

/* ─── mock: Prisma ───────────────────────────────────────────────────────── */
const mockNotifCreate      = jest.fn()
const mockNotifCount       = jest.fn()
const mockNotifFindMany    = jest.fn()
const mockNotifUpdateMany  = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    notification: {
      create:      (...a: unknown[]) => mockNotifCreate(...a),
      count:       (...a: unknown[]) => mockNotifCount(...a),
      findMany:    (...a: unknown[]) => mockNotifFindMany(...a),
      updateMany:  (...a: unknown[]) => mockNotifUpdateMany(...a),
    },
  },
}))

/* ─── helpers ────────────────────────────────────────────────────────────── */
const AUTH_SESSION = { user: { id: 'user-1' } }

function makeReq(url: string): NextRequest {
  return new NextRequest(url)
}

function makePatchReq(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/notifications/${id}`, {
    method: 'PATCH',
  })
}

/* ─── dynamic imports ────────────────────────────────────────────────────── */
let createNotification: typeof import('@/lib/notifications').createNotification
let getUnreadCount:     typeof import('@/lib/notifications').getUnreadCount
let listNotifications:  typeof import('@/lib/notifications').listNotifications
let markRead:           typeof import('@/lib/notifications').markRead
let markAllRead:        typeof import('@/lib/notifications').markAllRead
let GETnotifs:          (req: NextRequest) => Promise<Response>
let PATCHnotif:         (req: NextRequest, ctx: any) => Promise<Response>
let POSTreadAll:        () => Promise<Response>

beforeAll(async () => {
  const lib       = await import('@/lib/notifications')
  const listRoute = await import('@/app/api/notifications/route')
  const idRoute   = await import('@/app/api/notifications/[id]/route')
  const raRoute   = await import('@/app/api/notifications/read-all/route')

  createNotification = lib.createNotification
  getUnreadCount     = lib.getUnreadCount
  listNotifications  = lib.listNotifications
  markRead           = lib.markRead
  markAllRead        = lib.markAllRead
  GETnotifs          = listRoute.GET
  PATCHnotif         = idRoute.PATCH
  POSTreadAll        = raRoute.POST
})

beforeEach(() => {
  jest.clearAllMocks()
  mockGetServerSession.mockResolvedValue(AUTH_SESSION)
  mockNotifCreate.mockResolvedValue({ id: 'n1' })
  mockNotifCount.mockResolvedValue(0)
  mockNotifFindMany.mockResolvedValue([])
  mockNotifUpdateMany.mockResolvedValue({ count: 0 })
})

// ─── createNotification ───────────────────────────────────────────────────────

describe('createNotification()', () => {
  it('calls db.notification.create with correct data', async () => {
    await createNotification({
      userId:  'user-1',
      type:    'CERTIFICATE_ISSUED',
      titleEn: 'Certificate ready',
      titleAr: 'الشهادة جاهزة',
    })
    expect(mockNotifCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId:  'user-1',
        type:    'CERTIFICATE_ISSUED',
        titleEn: 'Certificate ready',
        titleAr: 'الشهادة جاهزة',
      }),
    })
  })

  it('does not throw on DB error (fire-and-forget)', async () => {
    mockNotifCreate.mockRejectedValue(new Error('DB error'))
    await expect(createNotification({
      userId:  'user-1',
      type:    'SYSTEM',
      titleEn: 'Test',
      titleAr: 'اختبار',
    })).resolves.toBeUndefined()
  })
})

// ─── getUnreadCount ───────────────────────────────────────────────────────────

describe('getUnreadCount()', () => {
  it('queries with userId and readAt: null', async () => {
    mockNotifCount.mockResolvedValue(3)
    const count = await getUnreadCount('user-1')
    expect(count).toBe(3)
    expect(mockNotifCount).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
    })
  })
})

// ─── listNotifications ────────────────────────────────────────────────────────

describe('listNotifications()', () => {
  it('returns items and total', async () => {
    mockNotifFindMany.mockResolvedValue([{ id: 'n1', titleEn: 'Hello' }])
    mockNotifCount.mockResolvedValue(5)
    const { items, total } = await listNotifications('user-1')
    expect(items).toHaveLength(1)
    expect(total).toBe(5)
  })

  it('respects limit and offset', async () => {
    mockNotifFindMany.mockResolvedValue([])
    mockNotifCount.mockResolvedValue(0)
    await listNotifications('user-1', 5, 10)
    expect(mockNotifFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5, skip: 10 }),
    )
  })
})

// ─── markRead ─────────────────────────────────────────────────────────────────

describe('markRead()', () => {
  it('updates with userId + id filter and sets readAt', async () => {
    mockNotifUpdateMany.mockResolvedValue({ count: 1 })
    const result = await markRead('n1', 'user-1')
    expect(result.count).toBe(1)
    expect(mockNotifUpdateMany).toHaveBeenCalledWith({
      where: { id: 'n1', userId: 'user-1' },
      data:  expect.objectContaining({ readAt: expect.any(Date) }),
    })
  })
})

// ─── markAllRead ──────────────────────────────────────────────────────────────

describe('markAllRead()', () => {
  it('updates all unread notifications for user', async () => {
    mockNotifUpdateMany.mockResolvedValue({ count: 4 })
    const result = await markAllRead('user-1')
    expect(result.count).toBe(4)
    expect(mockNotifUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
      data:  expect.objectContaining({ readAt: expect.any(Date) }),
    })
  })
})

// ─── GET /api/notifications ───────────────────────────────────────────────────

describe('GET /api/notifications', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await GETnotifs(makeReq('http://localhost/api/notifications'))
    expect(res.status).toBe(401)
  })

  it('returns items, total, and unreadCount', async () => {
    mockNotifFindMany.mockResolvedValue([{ id: 'n1', titleEn: 'Hello', readAt: null }])
    mockNotifCount.mockResolvedValueOnce(5)  // total (listNotifications)
    mockNotifCount.mockResolvedValueOnce(2)  // unreadCount
    const res  = await GETnotifs(makeReq('http://localhost/api/notifications'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.items).toHaveLength(1)
    expect(json.total).toBe(5)
    expect(json.unreadCount).toBe(2)
  })

  it('clamps limit to 50', async () => {
    mockNotifFindMany.mockResolvedValue([])
    mockNotifCount.mockResolvedValue(0)
    await GETnotifs(makeReq('http://localhost/api/notifications?limit=999'))
    expect(mockNotifFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    )
  })
})

// ─── PATCH /api/notifications/[id] ───────────────────────────────────────────

describe('PATCH /api/notifications/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await PATCHnotif(
      makePatchReq('n1'),
      { params: Promise.resolve({ id: 'n1' }) },
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 when notification not found or not owned', async () => {
    mockNotifUpdateMany.mockResolvedValue({ count: 0 })
    const res = await PATCHnotif(
      makePatchReq('missing'),
      { params: Promise.resolve({ id: 'missing' }) },
    )
    expect(res.status).toBe(404)
  })

  it('marks notification as read and returns 200', async () => {
    mockNotifUpdateMany.mockResolvedValue({ count: 1 })
    const res  = await PATCHnotif(
      makePatchReq('n1'),
      { params: Promise.resolve({ id: 'n1' }) },
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })
})

// ─── POST /api/notifications/read-all ────────────────────────────────────────

describe('POST /api/notifications/read-all', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POSTreadAll()
    expect(res.status).toBe(401)
  })

  it('marks all unread as read and returns count', async () => {
    mockNotifUpdateMany.mockResolvedValue({ count: 7 })
    const res  = await POSTreadAll()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.count).toBe(7)
    expect(mockNotifUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', readAt: null } }),
    )
  })

  it('returns count 0 when nothing to mark', async () => {
    mockNotifUpdateMany.mockResolvedValue({ count: 0 })
    const res  = await POSTreadAll()
    const json = await res.json()
    expect(json.count).toBe(0)
  })
})
