/**
 * Custom 404 — /[locale]/not-found
 *
 * Locale-aware: reads `lang` attribute already set on <html> by the root
 * locale layout. Falls back gracefully if called outside a locale route.
 *
 * Next.js App Router convention: this file is auto-used for notFound() calls
 * within the [locale] segment subtree.
 */
import { Link } from '@/i18n/navigation'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4 py-20">
      {/* Decorative number */}
      <p
        className="text-[120px] font-bold leading-none select-none"
        style={{ color: 'var(--color-primary, #C4622D)', opacity: 0.12 }}
        aria-hidden
      >
        404
      </p>

      {/* Icon */}
      <div className="mt-[-24px] mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto">
        <svg
          className="h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      {/* Bilingual text — both shown, primary locale first per HTML dir */}
      <h1 className="text-2xl font-bold text-foreground mb-3">
        الصفحة غير موجودة{' '}
        <span className="text-muted-foreground font-normal text-lg">·</span>{' '}
        <span className="text-muted-foreground text-xl font-semibold">Page Not Found</span>
      </h1>

      <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-2">
        تعذّر العثور على الصفحة التي تبحث عنها. ربما تم نقلها أو حذفها.
      </p>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-8">
        The page you were looking for could not be found. It may have been moved or deleted.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          العودة للرئيسية · Go Home
        </Link>
        <Link
          href="/courses"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          استعرض الدورات · Browse Courses
        </Link>
      </div>
    </div>
  )
}
