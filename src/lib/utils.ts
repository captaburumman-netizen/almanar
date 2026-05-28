/**
 * Shared utilities used throughout the ALMANAR codebase.
 */
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ─── shadcn/ui: className merge ───────────────────────────────────────────────

/** Merge Tailwind classes — resolves conflicts intelligently. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ─── i18n: bilingual model fields ─────────────────────────────────────────────

/**
 * Pick the correct locale-specific field from a bilingual DB model.
 *
 * Example:
 *   getField(course, 'title', 'ar')  →  course.titleAr
 *   getField(course, 'title', 'en')  →  course.titleEn
 */
export function getField<T extends Record<string, unknown>>(
  obj: T,
  field: string,
  locale: string
): string {
  const key = `${field}${locale === 'ar' ? 'Ar' : 'En'}` as keyof T
  return (obj[key] as string) ?? ''
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Format a price for display.
 * @param amount  - decimal amount (e.g. 29.99)
 * @param locale  - 'ar' | 'en'
 * @param currency - ISO currency code (default: 'USD')
 */
export function formatPrice(
  amount: number | string,
  locale = 'en',
  currency = 'USD'
): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    style:    'currency',
    currency,
    minimumFractionDigits: Number(amount) % 1 === 0 ? 0 : 2,
  }).format(Number(amount))
}

/**
 * Format a duration in seconds to "X hr Y min" or "Y min".
 */
export function formatDuration(seconds: number, locale = 'en'): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)

  if (locale === 'ar') {
    if (h > 0 && m > 0) return `${h} ساعة ${m} دقيقة`
    if (h > 0)           return `${h} ساعة`
    return `${m} دقيقة`
  }

  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0)           return `${h}h`
  return `${m}m`
}

/**
 * Format a date for display, respecting locale.
 */
export function formatDate(date: Date | string, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year:  'numeric',
    month: 'long',
    day:   'numeric',
  }).format(new Date(date))
}

// ─── Slugs ────────────────────────────────────────────────────────────────────

/**
 * Generate a URL-safe slug from a title.
 * Strips diacritics and normalises to ASCII-friendly lowercase.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[؀-ۿ]/g, '')  // strip Arabic chars (use manual slug for AR)
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ─── Download links ───────────────────────────────────────────────────────────

/** Full URL for a download token — sent in emails and stored in dashboard. */
export function buildDownloadUrl(token: string, baseUrl?: string): string {
  const base = baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${base}/api/downloads/${token}`
}

// ─── Guard helpers ────────────────────────────────────────────────────────────

/** Narrow `unknown` error to a string message. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'An unexpected error occurred'
}
