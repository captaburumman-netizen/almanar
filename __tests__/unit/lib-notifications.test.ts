/**
 * Unit tests — src/lib/notifications.ts
 *
 * Covers: createNotification, getUnreadCount, listNotifications,
 *         markRead, markAllRead.
 *
 * Prisma is mocked so tests run without a real DB.
 */

// ─── Mock: Prisma ─────────────────────────────────────────────────────────────

const mockNotificationCreate     = jest.fn()
const mockNotificationCount      = jest.fn()
const mockNotificationFindMany   = jest.fn()
const mockNotificationUpdateMany = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    notification: {
      create:     (...a: unknown[]) => mockNotificationCreate(...a),
      count:      (...a: unknown[]) => mockNotificationCount(...a),
      findMany:   (...a: unknown[]) => mockNotificationFindMany(...a),
      updateMany: (...a: unknown[]) => mockNotificationUpdateMany(...a),
    },
  },
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  createNotification,
  getUnreadCount,
  listNotifications,
  markRead,
  markAllRead,
} from '@/lib/notifications'
import type { NotificationType } from '@/lib/notifications'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_INPUT = {
  userId:  'user-1',
  type:    'CERTIFICATE_ISSUED' as NotificationType,
  titleEn: 'Certificate Issued',
  titleAr: 'تم إصدار الشهادة',
}

const NOTIF_ROW = {
  id:        'n1',
  type:      'CERTIFICATE_ISSUED' as NotificationType,
  titleEn:   'Certificate Issued',
  titleAr:   'تم إصدار الشهادة',
  bodyEn:    null,
  bodyAr:    null,
  link:      null,
  readAt:    null,
  createdAt: new Date('2024-06-15T12:00:00Z'),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockNotificationCreate.mockResolvedValue({ id: 'n1' })
  mockNotificationCount.mockResolvedValue(0)
  mockNotificationFindMany.mockResolvedValue([])
  mockNotificationUpdateMany.mockResolvedValue({ count: 0 })
})

// ═══════════════════════════════════════════════════════════════════════════════
// createNotification
// ═══════════════════════════════════════════════════════════════════════════════

describe('createNotification', () => {
  it('calls db.notification.create with the provided data', async () => {
    await createNotification(BASE_INPUT)
    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId:  'user-1',
        type:    'CERTIFICATE_ISSUED',
        titleEn: 'Certificate Issued',
        titleAr: 'تم إصدار الشهادة',
      }),
    })
  })

  it('includes optional bodyEn, bodyAr, and link when provided', async () => {
    await createNotification({
      ...BASE_INPUT,
      bodyEn: 'Your certificate is ready.',
      bodyAr: 'شهادتك جاهزة.',
      link:   '/en/certificates/abc123',
    })
    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bodyEn: 'Your certificate is ready.',
        bodyAr: 'شهادتك جاهزة.',
        link:   '/en/certificates/abc123',
      }),
    })
  })

  it('returns undefined (void function)', async () => {
    const result = await createNotification(BASE_INPUT)
    expect(result).toBeUndefined()
  })

  it('does not throw when DB create fails — non-fatal', async () => {
    mockNotificationCreate.mockRejectedValue(new Error('DB connection lost'))
    await expect(createNotification(BASE_INPUT)).resolves.toBeUndefined()
  })

  it('still resolves when DB throws a network error', async () => {
    mockNotificationCreate.mockRejectedValue(new TypeError('fetch failed'))
    await expect(createNotification(BASE_INPUT)).resolves.not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// getUnreadCount
// ═══════════════════════════════════════════════════════════════════════════════

describe('getUnreadCount', () => {
  it('queries only unread notifications for the given user', async () => {
    mockNotificationCount.mockResolvedValue(3)
    await getUnreadCount('user-1')
    expect(mockNotificationCount).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
    })
  })

  it('returns the count returned by the DB', async () => {
    mockNotificationCount.mockResolvedValue(7)
    expect(await getUnreadCount('user-1')).toBe(7)
  })

  it('returns 0 when there are no unread notifications', async () => {
    mockNotificationCount.mockResolvedValue(0)
    expect(await getUnreadCount('user-99')).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// listNotifications
// ═══════════════════════════════════════════════════════════════════════════════

describe('listNotifications', () => {
  beforeEach(() => {
    mockNotificationFindMany.mockResolvedValue([NOTIF_ROW])
    mockNotificationCount.mockResolvedValue(1)
  })

  it('returns items and total', async () => {
    const result = await listNotifications('user-1')
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(1)
  })

  it('uses default limit 20 and offset 0', async () => {
    await listNotifications('user-1')
    expect(mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 0 }),
    )
  })

  it('accepts a custom limit', async () => {
    await listNotifications('user-1', 5)
    expect(mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    )
  })

  it('accepts a custom offset', async () => {
    await listNotifications('user-1', 20, 40)
    expect(mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40 }),
    )
  })

  it('filters by userId', async () => {
    await listNotifications('user-42')
    expect(mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-42' } }),
    )
  })

  it('orders by createdAt descending', async () => {
    await listNotifications('user-1')
    expect(mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    )
  })

  it('counts total for the same userId', async () => {
    await listNotifications('user-9')
    expect(mockNotificationCount).toHaveBeenCalledWith({ where: { userId: 'user-9' } })
  })

  it('runs findMany and count in parallel (both called exactly once)', async () => {
    await listNotifications('user-1')
    expect(mockNotificationFindMany).toHaveBeenCalledTimes(1)
    expect(mockNotificationCount).toHaveBeenCalledTimes(1)
  })

  it('returns empty items and total 0 when there are no notifications', async () => {
    mockNotificationFindMany.mockResolvedValue([])
    mockNotificationCount.mockResolvedValue(0)
    const result = await listNotifications('user-empty')
    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// markRead
// ═══════════════════════════════════════════════════════════════════════════════

describe('markRead', () => {
  it('calls updateMany with the notification id and userId', async () => {
    mockNotificationUpdateMany.mockResolvedValue({ count: 1 })
    await markRead('n1', 'user-1')
    expect(mockNotificationUpdateMany).toHaveBeenCalledWith({
      where: { id: 'n1', userId: 'user-1' },
      data:  { readAt: expect.any(Date) },
    })
  })

  it('sets readAt to a current Date (not in the past)', async () => {
    const before = Date.now()
    mockNotificationUpdateMany.mockResolvedValue({ count: 1 })
    await markRead('n1', 'user-1')
    const call = mockNotificationUpdateMany.mock.calls[0]![0] as { data: { readAt: Date } }
    expect(call.data.readAt.getTime()).toBeGreaterThanOrEqual(before)
  })

  it('scopes the update to the given user (prevents reading other users\' notifications)', async () => {
    mockNotificationUpdateMany.mockResolvedValue({ count: 0 })
    await markRead('n-other', 'user-2')
    expect(mockNotificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-2' }) }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// markAllRead
// ═══════════════════════════════════════════════════════════════════════════════

describe('markAllRead', () => {
  it('calls updateMany for all unread notifications of the user', async () => {
    mockNotificationUpdateMany.mockResolvedValue({ count: 3 })
    await markAllRead('user-1')
    expect(mockNotificationUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
      data:  { readAt: expect.any(Date) },
    })
  })

  it('only targets unread notifications (readAt: null filter)', async () => {
    await markAllRead('user-1')
    const call = mockNotificationUpdateMany.mock.calls[0]![0] as { where: { readAt: null } }
    expect(call.where.readAt).toBeNull()
  })

  it('returns the updateMany result', async () => {
    mockNotificationUpdateMany.mockResolvedValue({ count: 5 })
    const result = await markAllRead('user-1')
    expect(result).toEqual({ count: 5 })
  })
})
