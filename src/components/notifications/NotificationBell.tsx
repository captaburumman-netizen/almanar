/**
 * NotificationBell — bell icon with unread count badge and dropdown.
 *
 * Receives the initial unread count from the server (Navbar server component).
 * On click it fetches the 10 most recent notifications and marks all as read.
 * Uses router.refresh() after mark-all-read so the server count updates.
 *
 * Designed to be mounted inside the Navbar's right cluster (desktop) and
 * inside NavbarMobileMenu (mobile).
 */
'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter }                                   from 'next/navigation'
import { Link }                                        from '@/i18n/navigation'

interface NotificationItem {
  id:        string
  type:      string
  titleEn:   string
  titleAr:   string
  bodyEn:    string | null
  bodyAr:    string | null
  link:      string | null
  readAt:    string | null
  createdAt: string
}

interface NotificationBellProps {
  initialUnread: number
  locale:        string
}

export function NotificationBell({ initialUnread, locale }: NotificationBellProps) {
  const [open,       setOpen]       = useState(false)
  const [unread,     setUnread]     = useState(initialUnread)
  const [items,      setItems]      = useState<NotificationItem[]>([])
  const [loading,    setLoading]    = useState(false)
  const [, startTransition] = useTransition()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router      = useRouter()
  const isAr        = locale === 'ar'

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Open: fetch notifications + mark all as read
  async function handleOpen() {
    const next = !open
    setOpen(next)
    if (!next) return

    setLoading(true)
    try {
      const res  = await fetch('/api/notifications?limit=10')
      const json = await res.json()
      setItems(json.items ?? [])
      setUnread(json.unreadCount ?? 0)

      // Mark all as read (fire-and-forget, refresh in background)
      if (json.unreadCount > 0) {
        startTransition(async () => {
          await fetch('/api/notifications/read-all', { method: 'POST' })
          setUnread(0)
          router.refresh()
        })
      }
    } catch {
      // Non-fatal
    } finally {
      setLoading(false)
    }
  }

  function formatRelative(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins  = Math.floor(diff / 60_000)
    const hours = Math.floor(diff / 3_600_000)
    const days  = Math.floor(diff / 86_400_000)
    if (mins < 1)    return isAr ? 'الآن'             : 'just now'
    if (mins < 60)   return isAr ? `منذ ${mins} د`    : `${mins}m ago`
    if (hours < 24)  return isAr ? `منذ ${hours} س`   : `${hours}h ago`
    return                  isAr ? `منذ ${days} يوم`  : `${days}d ago`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label={isAr ? `الإشعارات (${unread} غير مقروء)` : `Notifications (${unread} unread)`}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
      >
        {/* Bell SVG */}
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>

        {/* Unread badge */}
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-terracotta text-[9px] font-bold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={[
            'absolute top-full mt-2 z-50 w-80 rounded-xl border border-border bg-background shadow-lg ring-1 ring-black/5',
            locale === 'ar' ? 'start-0' : 'end-0',
          ].join(' ')}
          role="menu"
          aria-label={isAr ? 'الإشعارات' : 'Notifications'}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">
              {isAr ? 'الإشعارات' : 'Notifications'}
            </span>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isAr ? 'عرض الكل' : 'View all'}
            </Link>
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" aria-label="Loading" />
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <svg className="h-8 w-8 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <p className="text-sm text-muted-foreground">
                  {isAr ? 'لا توجد إشعارات' : 'No notifications yet'}
                </p>
              </div>
            )}

            {!loading && items.map((n) => {
              const title = isAr ? n.titleAr : n.titleEn
              const body  = isAr ? n.bodyAr  : n.bodyEn
              const isUnread = !n.readAt
              const inner = (
                <div
                  className={[
                    'flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors',
                    isUnread ? 'bg-primary/5' : '',
                  ].join(' ')}
                >
                  {/* Dot */}
                  <div className="mt-1.5 flex h-2 w-2 shrink-0 items-center justify-center">
                    {isUnread && (
                      <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{title}</p>
                    {body && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {formatRelative(n.createdAt)}
                    </p>
                  </div>
                </div>
              )

              return n.link ? (
                <a
                  key={n.id}
                  href={n.link}
                  onClick={() => setOpen(false)}
                  className="block"
                  role="menuitem"
                >
                  {inner}
                </a>
              ) : (
                <div key={n.id} role="menuitem">
                  {inner}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
