import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  // All supported locales — Arabic first as it is the default
  locales: ['ar', 'en'] as const,

  // Arabic is the platform default; / redirects to /ar
  defaultLocale: 'ar',

  // Keep locale prefix on every route (including default)
  // This makes the URL always explicit: /ar/courses, /en/courses
  localePrefix: 'always',
})

export type Locale = (typeof routing.locales)[number]
