/**
 * Root layout — required by Next.js App Router even when every real page
 * lives inside [locale]/layout.tsx.
 *
 * This file exists so that helper routes outside the [locale] segment
 * (e.g. the auth/signin redirect shim, not-found, etc.) have a valid
 * layout ancestor. Pages in this shim only call redirect() server-side,
 * so they never render any actual HTML.
 *
 * All locale-specific routes are handled by [locale]/layout.tsx which
 * provides the proper <html lang dir> shell.
 */

import type { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
