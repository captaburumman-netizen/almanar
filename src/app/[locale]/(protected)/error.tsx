/**
 * Protected segment error boundary.
 *
 * Shown when an unhandled exception occurs within the (protected) route group
 * (dashboard, course player, etc.).
 */
'use client'

import { useEffect } from 'react'
import { Link }      from '@/i18n/navigation'

interface ErrorProps {
  error:  Error & { digest?: string }
  reset:  () => void
}

export default function ProtectedError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[protected error]', error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-4 py-16">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mx-auto">
        <svg
          className="h-7 w-7 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374L10.051 3.378c.866-1.5 3.032-1.5 3.898 0l7.354 12.748zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      <h2 className="text-xl font-bold text-foreground mb-2">
        خطأ غير متوقع · Unexpected Error
      </h2>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed mb-6">
        حدث خطأ أثناء تحميل هذه الصفحة. يرجى المحاولة مجددًا.
        <br />
        An error occurred loading this page. Please try again.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
        >
          حاول مجددًا · Retry
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          لوحتي · My Dashboard
        </Link>
      </div>
    </div>
  )
}
