/**
 * SEO utilities — metadata builders and JSON-LD generators.
 *
 * All metadata builders return a Next.js `Metadata` object ready to be
 * returned from `generateMetadata()`. JSON-LD generators return a plain
 * object to be serialised into a <script type="application/ld+json"> tag.
 */
import type { Metadata } from 'next'

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_URL   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://almanar.co'
const SITE_NAME = 'ALMANAR'
const CURRENCY  = 'USD'

const DEFAULT_DESCRIPTION = {
  en: 'Premium bilingual parenting education — courses, workshops, and expert guides in Arabic and English.',
  ar: 'تعليم الوالدية المتميز ثنائي اللغة — دورات وورش عمل وأدلة خبراء بالعربية والإنجليزية.',
}

// ─── OG image URL builder ─────────────────────────────────────────────────────

export function ogImageUrl(params: Record<string, string>): string {
  const sp = new URLSearchParams(params)
  return `${APP_URL}/api/og?${sp.toString()}`
}

// ─── Course metadata ──────────────────────────────────────────────────────────

interface CourseMetaInput {
  titleEn:      string
  titleAr:      string
  shortDescEn?: string | null
  shortDescAr?: string | null
  slug:         string
  thumbnail?:   string | null
  locale:       string
}

export function buildCourseMetadata(course: CourseMetaInput): Metadata {
  const isAr       = course.locale === 'ar'
  const title      = isAr ? course.titleAr  : course.titleEn
  const desc       = (isAr ? course.shortDescAr : course.shortDescEn)
                     ?? DEFAULT_DESCRIPTION[isAr ? 'ar' : 'en']
  const pageUrl    = `${APP_URL}/${course.locale}/courses/${course.slug}`

  // Prefer the real thumbnail; fall back to a generated branded card
  const ogImage    = course.thumbnail
    ?? ogImageUrl({
         type:     'course',
         title,
         subtitle: desc.slice(0, 80),
         badge:    isAr ? 'دورة' : 'Course',
         locale:   course.locale,
       })

  return {
    title:       `${title} | ${SITE_NAME}`,
    description: desc,
    alternates:  { canonical: pageUrl },
    openGraph: {
      title,
      description: desc,
      url:         pageUrl,
      siteName:    SITE_NAME,
      type:        'website',
      images: [{
        url:    ogImage,
        width:  1200,
        height: 630,
        alt:    title,
      }],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description: desc,
      images:      [ogImage],
    },
  }
}

// ─── Product metadata ─────────────────────────────────────────────────────────

interface ProductMetaInput {
  titleEn:        string
  titleAr:        string
  descriptionEn?: string | null
  descriptionAr?: string | null
  slug:           string
  coverImage?:    string | null
  locale:         string
}

export function buildProductMetadata(product: ProductMetaInput): Metadata {
  const isAr    = product.locale === 'ar'
  const title   = isAr ? product.titleAr : product.titleEn
  const rawDesc = isAr ? product.descriptionAr : product.descriptionEn
  // Strip markdown-style headers/bold for meta descriptions
  const desc    = (rawDesc ?? DEFAULT_DESCRIPTION[isAr ? 'ar' : 'en'])
                    .replace(/#{1,6}\s/g, '')
                    .replace(/\*\*/g, '')
                    .slice(0, 160)
  const pageUrl = `${APP_URL}/${product.locale}/store/${product.slug}`

  const ogImage = product.coverImage
    ?? ogImageUrl({
         type:     'product',
         title,
         subtitle: desc.slice(0, 80),
         badge:    isAr ? 'منتج' : 'Product',
         locale:   product.locale,
       })

  return {
    title:       `${title} | ${SITE_NAME}`,
    description: desc,
    alternates:  { canonical: pageUrl },
    openGraph: {
      title,
      description: desc,
      url:         pageUrl,
      siteName:    SITE_NAME,
      type:        'website',
      images: [{
        url:    ogImage,
        width:  1200,
        height: 630,
        alt:    title,
      }],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description: desc,
      images:      [ogImage],
    },
  }
}

// ─── Certificate metadata ─────────────────────────────────────────────────────

interface CertMetaInput {
  userName:   string | null
  courseName: string
  code:       string
  locale:     string
}

export function buildCertificateMetadata(cert: CertMetaInput): Metadata {
  const recipient = cert.userName ?? 'Student'
  const titleEn   = `Certificate: ${cert.courseName} — ${SITE_NAME}`
  const descEn    = `${recipient} completed "${cert.courseName}" on ${SITE_NAME}`
  const ogImage   = ogImageUrl({
    type:     'certificate',
    title:    `${recipient}`,
    subtitle: cert.courseName,
    badge:    cert.locale === 'ar' ? 'شهادة إتمام' : 'Certificate',
    locale:   cert.locale,
  })

  return {
    title:       titleEn,
    description: descEn,
    openGraph: {
      title:       `Certificate of Completion — ${cert.courseName}`,
      description: descEn,
      url:         `${APP_URL}/${cert.locale}/certificates/${cert.code}`,
      siteName:    SITE_NAME,
      type:        'website',
      images: [{
        url:    ogImage,
        width:  1200,
        height: 630,
        alt:    titleEn,
      }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       titleEn,
      description: descEn,
      images:      [ogImage],
    },
  }
}

// ─── JSON-LD: Course ──────────────────────────────────────────────────────────

interface CourseJsonLdInput {
  titleEn:      string
  titleAr:      string
  shortDescEn?: string | null
  slug:         string
  price?:       number | null
  isFree:       boolean
  avgRating?:   number
  reviewCount?: number
}

export function courseJsonLd(c: CourseJsonLdInput) {
  const base: Record<string, unknown> = {
    '@context':   'https://schema.org',
    '@type':      'Course',
    name:          c.titleEn,
    alternateName: c.titleAr,
    description:   c.shortDescEn ?? '',
    url:           `${APP_URL}/en/courses/${c.slug}`,
    provider: {
      '@type': 'Organization',
      name:    SITE_NAME,
      url:     APP_URL,
    },
  }

  if (!c.isFree && c.price && c.price > 0) {
    base.offers = {
      '@type':        'Offer',
      price:          c.price.toFixed(2),
      priceCurrency:  CURRENCY,
      availability:   'https://schema.org/InStock',
      url:            `${APP_URL}/en/courses/${c.slug}`,
    }
  }

  if (c.reviewCount && c.reviewCount > 0 && c.avgRating) {
    base.aggregateRating = {
      '@type':       'AggregateRating',
      ratingValue:   c.avgRating.toFixed(1),
      reviewCount:   c.reviewCount,
      bestRating:    '5',
      worstRating:   '1',
    }
  }

  return base
}

// ─── JSON-LD: Product ─────────────────────────────────────────────────────────

interface ProductJsonLdInput {
  titleEn:        string
  titleAr:        string
  descriptionEn?: string | null
  slug:           string
  price?:         number | null
  isFree:         boolean
  coverImage?:    string | null
  avgRating?:     number
  reviewCount?:   number
}

export function productJsonLd(p: ProductJsonLdInput) {
  const base: Record<string, unknown> = {
    '@context':   'https://schema.org',
    '@type':      'Product',
    name:          p.titleEn,
    alternateName: p.titleAr,
    description:   (p.descriptionEn ?? '').replace(/#{1,6}\s/g, '').replace(/\*\*/g, '').slice(0, 300),
    url:           `${APP_URL}/en/store/${p.slug}`,
    brand: {
      '@type': 'Brand',
      name:    SITE_NAME,
    },
  }

  if (p.coverImage) {
    base.image = p.coverImage
  }

  if (!p.isFree && p.price && p.price > 0) {
    base.offers = {
      '@type':        'Offer',
      price:          p.price.toFixed(2),
      priceCurrency:  CURRENCY,
      availability:   'https://schema.org/InStock',
      url:            `${APP_URL}/en/store/${p.slug}`,
    }
  } else if (p.isFree) {
    base.offers = {
      '@type':        'Offer',
      price:          '0.00',
      priceCurrency:  CURRENCY,
      availability:   'https://schema.org/InStock',
    }
  }

  if (p.reviewCount && p.reviewCount > 0 && p.avgRating) {
    base.aggregateRating = {
      '@type':       'AggregateRating',
      ratingValue:   p.avgRating.toFixed(1),
      reviewCount:   p.reviewCount,
      bestRating:    '5',
      worstRating:   '1',
    }
  }

  return base
}

// ─── JSON-LD: Organization (site-wide) ───────────────────────────────────────

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type':    'Organization',
    name:       SITE_NAME,
    url:        APP_URL,
    logo:       `${APP_URL}/og-default.png`,
    sameAs:     [],
  }
}

// ─── JSON-LD: BreadcrumbList ──────────────────────────────────────────────────

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context':       'https://schema.org',
    '@type':          'BreadcrumbList',
    itemListElement:  items.map((item, i) => ({
      '@type':   'ListItem',
      position:  i + 1,
      name:      item.name,
      item:      item.url,
    })),
  }
}
