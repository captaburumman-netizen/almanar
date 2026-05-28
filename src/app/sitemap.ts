/**
 * Dynamic sitemap — /sitemap.xml
 *
 * Includes:
 *   - Static marketing pages (both locales)
 *   - All published courses
 *   - All published products
 *
 * Next.js App Router automatically serves this at /sitemap.xml.
 */
import type { MetadataRoute } from 'next'
import { db }                 from '@/lib/db'

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://almanar.co'
const LOCALES  = ['ar', 'en'] as const

/** Static pages that exist for both locales */
const STATIC_PATHS = [
  '',            // home
  '/courses',
  '/store',
  '/pricing',
] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []

  // ── Static pages ──────────────────────────────────────────────────────────
  for (const path of STATIC_PATHS) {
    for (const locale of LOCALES) {
      entries.push({
        url:            `${APP_URL}/${locale}${path}`,
        lastModified:   new Date(),
        changeFrequency: path === '' ? 'daily' : 'weekly',
        priority:        path === '' ? 1.0 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => [l === 'ar' ? 'ar-SA' : 'en-US', `${APP_URL}/${l}${path}`])
          ),
        },
      })
    }
  }

  // ── Published courses ─────────────────────────────────────────────────────
  const courses = await db.course.findMany({
    where:   { isPublished: true },
    select:  { slug: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
  }).catch(() => [] as { slug: string; updatedAt: Date }[])

  for (const course of courses) {
    for (const locale of LOCALES) {
      entries.push({
        url:            `${APP_URL}/${locale}/courses/${course.slug}`,
        lastModified:   course.updatedAt,
        changeFrequency: 'weekly',
        priority:        0.7,
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => [l === 'ar' ? 'ar-SA' : 'en-US', `${APP_URL}/${l}/courses/${course.slug}`])
          ),
        },
      })
    }
  }

  // ── Published products ────────────────────────────────────────────────────
  const products = await db.product.findMany({
    where:   { isPublished: true },
    select:  { slug: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
  }).catch(() => [] as { slug: string; updatedAt: Date }[])

  for (const product of products) {
    for (const locale of LOCALES) {
      entries.push({
        url:            `${APP_URL}/${locale}/store/${product.slug}`,
        lastModified:   product.updatedAt,
        changeFrequency: 'monthly',
        priority:        0.6,
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => [l === 'ar' ? 'ar-SA' : 'en-US', `${APP_URL}/${l}/store/${product.slug}`])
          ),
        },
      })
    }
  }

  // ── Published bundles ─────────────────────────────────────────────────────
  const bundles = await db.bundle.findMany({
    where:   { isPublished: true },
    select:  { slug: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
  }).catch(() => [] as { slug: string; updatedAt: Date }[])

  for (const bundle of bundles) {
    for (const locale of LOCALES) {
      entries.push({
        url:            `${APP_URL}/${locale}/store/bundles/${bundle.slug}`,
        lastModified:   bundle.updatedAt,
        changeFrequency: 'monthly',
        priority:        0.6,
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => [l === 'ar' ? 'ar-SA' : 'en-US', `${APP_URL}/${l}/store/bundles/${bundle.slug}`])
          ),
        },
      })
    }
  }

  return entries
}
