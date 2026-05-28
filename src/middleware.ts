import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

/**
 * next-intl middleware handles:
 *  1. Locale detection from URL prefix
 *  2. Redirecting / → /ar  (default locale)
 *  3. Setting the locale cookie for subsequent requests
 *
 * Route protection (auth gates) is done inside individual layouts/pages
 * using NextAuth's getServerSession — not in Edge middleware — to avoid
 * Prisma/Node.js SDK conflicts in the Edge runtime.
 */
export default createMiddleware(routing)

export const config = {
  // Match all paths EXCEPT:
  //  - /api/*          (API routes — no locale prefix)
  //  - /_next/*        (Next.js internals)
  //  - /_vercel/*      (Vercel internals)
  //  - /favicon.ico, /robots.txt, and any static file with an extension
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
