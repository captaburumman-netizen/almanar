/**
 * Admin shell layout — Kajabi-style dark sidebar + white top bar + light content area
 */
import type { ReactNode }   from 'react'
import { requireAdmin }     from '@/lib/session'
import { AdminNav }         from '@/components/admin/AdminNav'
import { AdminTopBar }      from '@/components/admin/AdminTopBar'
import type { Locale }      from '@/i18n/routing'

interface AdminLayoutProps {
  children: ReactNode
  params:   Promise<{ locale: Locale }>
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = await params
  await requireAdmin(locale)

  return (
    <div className="flex h-screen overflow-hidden bg-stone-100">

      {/* ── Dark Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 bg-stone-950 flex flex-col overflow-y-auto z-30">
        <AdminNav locale={locale} />
      </aside>

      {/* ── Right panel: top bar + scrollable content ────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Top bar */}
        <AdminTopBar />

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
