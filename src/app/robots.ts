/**
 * robots.ts — /robots.txt
 *
 * Allows all crawlers to index marketing pages.
 * Blocks admin, API, auth, and protected dashboard paths.
 */
import type { MetadataRoute } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://almanar.co'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow:     '/',
        disallow:  [
          '/api/',
          '/admin/',
          '/ar/admin/',
          '/en/admin/',
          '/ar/dashboard/',
          '/en/dashboard/',
          '/ar/auth/',
          '/en/auth/',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host:    APP_URL,
  }
}
