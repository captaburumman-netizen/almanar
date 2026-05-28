/**
 * Notification helpers.
 *
 * createNotification()  — fire-and-forget helper used throughout the codebase
 *                         (certificates, review moderation, enrollments, etc.)
 * getUnreadCount()      — fast count for the navbar bell badge
 * listNotifications()   — paginated list for the dropdown / notification page
 * markRead()            — mark a single notification as read
 * markAllRead()         — mark all notifications for a user as read
 */
import { db } from '@/lib/db'
import type { NotificationType } from '@prisma/client'

export type { NotificationType }

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateNotificationInput {
  userId:  string
  type:    NotificationType
  titleEn: string
  titleAr: string
  bodyEn?: string
  bodyAr?: string
  link?:   string  // relative URL, e.g. '/en/certificates/abc'
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a notification. Non-fatal — any DB error is silently swallowed
 * so callers don't need try/catch.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId:  input.userId,
        type:    input.type,
        titleEn: input.titleEn,
        titleAr: input.titleAr,
        bodyEn:  input.bodyEn,
        bodyAr:  input.bodyAr,
        link:    input.link,
      },
    })
  } catch {
    // Notifications are non-critical — never block the main flow
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getUnreadCount(userId: string): Promise<number> {
  return db.notification.count({
    where: { userId, readAt: null },
  })
}

export async function listNotifications(
  userId: string,
  limit  = 20,
  offset = 0,
) {
  const [items, total] = await Promise.all([
    db.notification.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
      skip:    offset,
      select: {
        id:        true,
        type:      true,
        titleEn:   true,
        titleAr:   true,
        bodyEn:    true,
        bodyAr:    true,
        link:      true,
        readAt:    true,
        createdAt: true,
      },
    }),
    db.notification.count({ where: { userId } }),
  ])
  return { items, total }
}

// ─── Mark read ────────────────────────────────────────────────────────────────

export async function markRead(notificationId: string, userId: string) {
  return db.notification.updateMany({
    where: { id: notificationId, userId },
    data:  { readAt: new Date() },
  })
}

export async function markAllRead(userId: string) {
  return db.notification.updateMany({
    where: { userId, readAt: null },
    data:  { readAt: new Date() },
  })
}
