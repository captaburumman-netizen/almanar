'use client'

import { usePathname } from 'next/navigation'

// Map pathname suffixes to page titles
const TITLE_MAP: Record<string, string> = {
  '/admin':               'Overview',
  '/admin/courses':       'Courses',
  '/admin/courses/new':   'New Course',
  '/admin/products':      'Products',
  '/admin/products/new':  'New Product',
  '/admin/bundles':       'Bundles',
  '/admin/plans':         'Plans',
  '/admin/subscriptions': 'Members',
  '/admin/coupons':       'Coupons',
  '/admin/reviews':       'Reviews',
  '/admin/broadcast':     'Broadcast',
  '/admin/users':         'Users',
  '/admin/analytics':     'Analytics',
}

function getTitle(pathname: string): string {
  // Try exact match first
  for (const [key, label] of Object.entries(TITLE_MAP)) {
    if (pathname.endsWith(key)) return label
  }
  // Dynamic segment fallbacks
  if (pathname.includes('/lessons/')) return 'Lesson'
  if (pathname.includes('/courses/')) return 'Course'
  if (pathname.includes('/products/')) return 'Product'
  if (pathname.includes('/users/')) return 'User'
  if (pathname.includes('/bundles/')) return 'Bundle'
  if (pathname.includes('/coupons/')) return 'Coupon'
  if (pathname.includes('/plans/')) return 'Plan'
  return 'Admin'
}

export function AdminTopBar() {
  const pathname = usePathname()
  const title = getTitle(pathname)

  return (
    <header className="h-14 shrink-0 bg-white border-b border-stone-200 flex items-center justify-between px-6 z-20">
      {/* Left: page title */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-stone-800">{title}</h1>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        {/* View site shortcut */}
        <a
          href="/"
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-stone-300 hover:text-stone-900 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          View Site
        </a>

        {/* Admin avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-stone-900 font-bold text-xs cursor-default">
          A
        </div>
      </div>
    </header>
  )
}
