/**
 * Marketing segment error boundary.
 *
 * Shown when an unhandled exception occurs within the (marketing) route group.
 * Client component — required by Next.js for error.tsx.
 */
'use client'

import { useEffect } from 'react'
import { Link }      from '@/i18n/navigation'

interface ErrorProps {
  error:  Error & { digest?: string }
  reset:  () => void
}

export default function MarketingError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to console in development; replace with error-tracking service in prod
    console.error('[marketing error]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4 py-20">
      {/* Icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto">
        <svg
          className="h-8 w-8 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-3">
        حدث خطأ ما{' '}
        <span className="text-muted-foreground font-normal text-lg">·</span>{' '}
        <span className="text-muted-foreground text-xl font-semibold">Something Went Wrong</span>
      </h1>

      <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-8">
        نعتذر عن الإزعاج — حدث خطأ غير متوقع. يمكنك المحاولة مجددًا أو العودة للرئيسية.
        <br className="mt-1" />
        We apologize — an unexpected error occurred. Try again or go back home.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
        >
          حاول مجددًا · Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          الرئيسية · Home
        </Link>
      </div>
    </div>
  )
}
