import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/**
 * Security headers applied to all responses.
 * CSP is intentionally omitted here — Next.js 14 App Router requires
 * nonce-based CSP which is configured separately via middleware.
 */
const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Refuse to render the page in a frame (clickjacking protection)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Enable XSS filter in legacy browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Send only origin in the Referer header (no path/query)
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restrict sensitive browser features
  {
    key:   'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // Force HTTPS for 2 years (only effective in production over HTTPS)
  {
    key:   'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Control DNS prefetching
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
        pathname: '/**',
      },
    ],
  },

  // Prisma + bcryptjs must not be bundled for Edge runtime
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },

  // Apply security headers to all routes
  async headers() {
    return [
      {
        source:  '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
