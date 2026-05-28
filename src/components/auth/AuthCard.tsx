/**
 * AuthCard — shared wrapper for all authentication form pages.
 *
 * Renders the ALMANAR logo, a heading/sub-heading, and the form slot.
 * Handles both LTR (English) and RTL (Arabic) automatically via Tailwind
 * logical properties.
 */
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface AuthCardProps {
  /** Page heading */
  title:       string
  /** Optional descriptive subtext */
  description?: string
  /** Form content */
  children:    React.ReactNode
  /** Optional footer link rendered below the card */
  footer?:     React.ReactNode
  className?:  string
}

export function AuthCard({ title, description, children, footer, className }: AuthCardProps) {
  return (
    <div className={cn('w-full max-w-auth space-y-6', className)}>
      {/* Brand mark */}
      <div className="text-center space-y-2">
        <Link
          href="/"
          className="inline-block text-2xl font-bold tracking-tight text-terracotta hover:opacity-80 transition-opacity"
          aria-label="ALMANAR — Home"
        >
          المنار
        </Link>

        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="card-brand p-6 sm:p-8 space-y-5">
        {children}
      </div>

      {/* Optional footer */}
      {footer && (
        <div className="text-center text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  )
}
