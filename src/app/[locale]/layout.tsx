import type { Metadata, Viewport } from 'next'
import { DM_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google'
import { notFound } from 'next/navigation'
import { getMessages, getTranslations } from 'next-intl/server'

import { routing } from '@/i18n/routing'
import type { Locale } from '@/i18n/routing'
import { Providers } from '@/components/Providers'
import '@/app/globals.css'

// ─── Fonts ────────────────────────────────────────────────────────────────────

/**
 * DM Sans — primary English typeface
 * Humanist sans-serif: warm, modern, highly legible
 */
const dmSans = DM_Sans({
  subsets:  ['latin', 'latin-ext'],
  variable: '--font-dm-sans',
  weight:   ['300', '400', '500', '600', '700'],
  display:  'swap',
})

/**
 * IBM Plex Sans Arabic — primary Arabic typeface
 * High-quality Arabic web font with strong Latin fallback.
 * Designed for digital screens; excellent RTL rendering.
 */
const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets:  ['arabic'],
  variable: '--font-ibm-plex-arabic',
  weight:   ['300', '400', '500', '600', '700'],
  display:  'swap',
})

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const viewport: Viewport = {
  width:      'device-width',
  initialScale: 1,
  themeColor: '#C4622D', // terracotta
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: {
      default:  t('title'),
      template: `%s | ${t('brand')}`,
    },
    description: t('description'),
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    ),
    openGraph: {
      siteName: 'ALMANAR',
      locale:   locale === 'ar' ? 'ar_SA' : 'en_US',
      type:     'website',
    },
    robots: {
      index:  true,
      follow: true,
    },
  }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

// ─── Layout ───────────────────────────────────────────────────────────────────

interface LocaleLayoutProps {
  children: React.ReactNode
  params:   Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params

  // Validate locale — return 404 for unsupported values
  if (!routing.locales.includes(locale as Locale)) {
    notFound()
  }

  // RTL for Arabic, LTR for all others
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  // Load translation messages for the current locale
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      dir={dir}
      /**
       * Both font CSS variables are always injected so components can
       * reference either --font-dm-sans or --font-ibm-plex-arabic.
       * Active font switched via [lang="ar"] body rule in globals.css.
       */
      className={`${dmSans.variable} ${ibmPlexArabic.variable}`}
      suppressHydrationWarning
    >
      <head />
      <body>
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  )
}
