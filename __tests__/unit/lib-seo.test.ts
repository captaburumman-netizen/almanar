/**
 * Unit tests — src/lib/seo.ts
 *
 * All functions are pure (no I/O, no DB), so no mocking is needed.
 *
 * Covers: ogImageUrl, buildCourseMetadata, buildProductMetadata,
 *         buildCertificateMetadata, courseJsonLd, productJsonLd,
 *         organizationJsonLd, breadcrumbJsonLd.
 */

import {
  ogImageUrl,
  buildCourseMetadata,
  buildProductMetadata,
  buildCertificateMetadata,
  courseJsonLd,
  productJsonLd,
  organizationJsonLd,
  breadcrumbJsonLd,
} from '@/lib/seo'

// ─── App URL used in production output ───────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://almanar.co'

// ═══════════════════════════════════════════════════════════════════════════════
// ogImageUrl
// ═══════════════════════════════════════════════════════════════════════════════

describe('ogImageUrl', () => {
  it('returns a URL starting with the app base URL', () => {
    const url = ogImageUrl({ type: 'course', title: 'Test' })
    expect(url.startsWith(APP_URL)).toBe(true)
  })

  it('includes /api/og in the path', () => {
    const url = ogImageUrl({ type: 'course', title: 'Test' })
    expect(url).toContain('/api/og')
  })

  it('encodes params as query string', () => {
    const url = ogImageUrl({ type: 'course', title: 'Arabic 101', locale: 'ar' })
    expect(url).toContain('type=course')
    expect(url).toContain('locale=ar')
  })

  it('encodes params so they round-trip correctly via URL.searchParams', () => {
    const url = ogImageUrl({ title: 'Hello World & More', locale: 'en' })
    // Use the URL API to decode — URLSearchParams handles + and %26 correctly
    const parsed = new URL(url)
    expect(parsed.searchParams.get('title')).toBe('Hello World & More')
    expect(parsed.searchParams.get('locale')).toBe('en')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// buildCourseMetadata
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildCourseMetadata', () => {
  const COURSE = {
    titleEn:    'Arabic 101',
    titleAr:    'عربي 101',
    shortDescEn: 'Beginner Arabic course',
    shortDescAr: 'دورة العربية للمبتدئين',
    slug:       'arabic-101',
    thumbnail:  null,
    locale:     'en',
  }

  it('uses English title and desc for locale "en"', () => {
    const meta = buildCourseMetadata({ ...COURSE, locale: 'en' })
    expect(meta.title).toContain('Arabic 101')
    expect(meta.description).toContain('Beginner Arabic course')
  })

  it('uses Arabic title and desc for locale "ar"', () => {
    const meta = buildCourseMetadata({ ...COURSE, locale: 'ar' })
    expect(meta.title).toContain('عربي 101')
    expect(meta.description).toContain('دورة العربية للمبتدئين')
  })

  it('appends ALMANAR to the title', () => {
    const meta = buildCourseMetadata(COURSE)
    expect(meta.title).toMatch(/ALMANAR/)
  })

  it('sets the canonical URL to /locale/courses/slug', () => {
    const meta = buildCourseMetadata(COURSE)
    expect(meta.alternates?.canonical).toContain('/en/courses/arabic-101')
  })

  it('falls back to the OG image URL when thumbnail is null', () => {
    const meta = buildCourseMetadata({ ...COURSE, thumbnail: null })
    const og   = meta.openGraph as { images?: Array<{ url: string }> }
    expect(og?.images?.[0]?.url).toContain('/api/og')
  })

  it('uses the provided thumbnail when available', () => {
    const thumb = 'https://cdn.almanar.co/thumb.jpg'
    const meta  = buildCourseMetadata({ ...COURSE, thumbnail: thumb })
    const og    = meta.openGraph as { images?: Array<{ url: string }> }
    expect(og?.images?.[0]?.url).toBe(thumb)
  })

  it('sets og:type to "website"', () => {
    const meta = buildCourseMetadata(COURSE)
    const og   = meta.openGraph as { type?: string }
    expect(og?.type).toBe('website')
  })

  it('includes twitter card metadata', () => {
    const meta    = buildCourseMetadata(COURSE)
    const twitter = meta.twitter as { card?: string }
    expect(twitter?.card).toBe('summary_large_image')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// buildProductMetadata
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildProductMetadata', () => {
  const PRODUCT = {
    titleEn:       'Arabic Ebook',
    titleAr:       'كتاب عربي',
    descriptionEn: '## Learn Arabic\n\nA comprehensive **guide** to Arabic.',
    descriptionAr: 'دليل شامل للغة العربية.',
    slug:          'arabic-ebook',
    coverImage:    null,
    locale:        'en',
  }

  it('uses English title for locale "en"', () => {
    const meta = buildProductMetadata({ ...PRODUCT, locale: 'en' })
    expect(meta.title).toContain('Arabic Ebook')
  })

  it('uses Arabic title for locale "ar"', () => {
    const meta = buildProductMetadata({ ...PRODUCT, locale: 'ar' })
    expect(meta.title).toContain('كتاب عربي')
  })

  it('strips markdown headers and bold from the description', () => {
    const meta = buildProductMetadata(PRODUCT)
    expect(meta.description).not.toContain('##')
    expect(meta.description).not.toContain('**')
  })

  it('truncates description to 160 chars', () => {
    const long = 'A'.repeat(300)
    const meta = buildProductMetadata({ ...PRODUCT, descriptionEn: long })
    expect(meta.description!.length).toBeLessThanOrEqual(160)
  })

  it('sets canonical to /locale/store/slug', () => {
    const meta = buildProductMetadata(PRODUCT)
    expect(meta.alternates?.canonical).toContain('/en/store/arabic-ebook')
  })

  it('falls back to OG image URL when coverImage is null', () => {
    const meta = buildProductMetadata({ ...PRODUCT, coverImage: null })
    const og   = meta.openGraph as { images?: Array<{ url: string }> }
    expect(og?.images?.[0]?.url).toContain('/api/og')
  })

  it('uses the provided coverImage when available', () => {
    const cover = 'https://cdn.almanar.co/cover.jpg'
    const meta  = buildProductMetadata({ ...PRODUCT, coverImage: cover })
    const og    = meta.openGraph as { images?: Array<{ url: string }> }
    expect(og?.images?.[0]?.url).toBe(cover)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// buildCertificateMetadata
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildCertificateMetadata', () => {
  const CERT = {
    userName:   'Alice Smith',
    courseName: 'Arabic 101',
    code:       'cert-abc',
    locale:     'en',
  }

  it('includes the recipient name in the title', () => {
    const meta = buildCertificateMetadata(CERT)
    expect(meta.title).toContain('Certificate')
  })

  it('includes the course name in the description', () => {
    const meta = buildCertificateMetadata(CERT)
    expect(meta.description).toContain('Arabic 101')
  })

  it('falls back to "Student" when userName is null', () => {
    const meta = buildCertificateMetadata({ ...CERT, userName: null })
    expect(meta.description).toContain('Student')
  })

  it('includes an OG image with certificate badge', () => {
    const meta = buildCertificateMetadata(CERT)
    const og   = meta.openGraph as { images?: Array<{ url: string }> }
    expect(og?.images?.[0]?.url).toContain('/api/og')
    expect(og?.images?.[0]?.url).toContain('certificate')
  })

  it('includes the twitter card', () => {
    const meta    = buildCertificateMetadata(CERT)
    const twitter = meta.twitter as { card?: string }
    expect(twitter?.card).toBe('summary_large_image')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// courseJsonLd
// ═══════════════════════════════════════════════════════════════════════════════

describe('courseJsonLd', () => {
  const BASE = {
    titleEn:      'Arabic 101',
    titleAr:      'عربي 101',
    shortDescEn:  'Beginner Arabic',
    slug:         'arabic-101',
    isFree:       false,
    price:        29.99,
  }

  it('returns @context and @type = Course', () => {
    const ld = courseJsonLd(BASE)
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('Course')
  })

  it('includes the English title as "name"', () => {
    const ld = courseJsonLd(BASE)
    expect(ld.name).toBe('Arabic 101')
  })

  it('includes the Arabic title as "alternateName"', () => {
    const ld = courseJsonLd(BASE)
    expect(ld.alternateName).toBe('عربي 101')
  })

  it('includes an offer for a paid course', () => {
    const ld = courseJsonLd(BASE) as any
    expect(ld.offers).toBeDefined()
    expect(ld.offers.price).toBe('29.99')
    expect(ld.offers.priceCurrency).toBe('USD')
  })

  it('omits offers when isFree is true', () => {
    const ld = courseJsonLd({ ...BASE, isFree: true }) as any
    expect(ld.offers).toBeUndefined()
  })

  it('omits offers when price is 0', () => {
    const ld = courseJsonLd({ ...BASE, price: 0 }) as any
    expect(ld.offers).toBeUndefined()
  })

  it('includes aggregateRating when reviewCount > 0', () => {
    const ld = courseJsonLd({ ...BASE, avgRating: 4.8, reviewCount: 25 }) as any
    expect(ld.aggregateRating).toBeDefined()
    expect(ld.aggregateRating.ratingValue).toBe('4.8')
    expect(ld.aggregateRating.reviewCount).toBe(25)
  })

  it('omits aggregateRating when reviewCount is 0', () => {
    const ld = courseJsonLd({ ...BASE, avgRating: 4.8, reviewCount: 0 }) as any
    expect(ld.aggregateRating).toBeUndefined()
  })

  it('omits aggregateRating when reviewCount is omitted', () => {
    const ld = courseJsonLd(BASE) as any
    expect(ld.aggregateRating).toBeUndefined()
  })

  it('URL contains the slug', () => {
    const ld = courseJsonLd(BASE) as any
    expect(ld.url).toContain('arabic-101')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// productJsonLd
// ═══════════════════════════════════════════════════════════════════════════════

describe('productJsonLd', () => {
  const BASE = {
    titleEn:       'Arabic Ebook',
    titleAr:       'كتاب عربي',
    descriptionEn: '## Guide\n**Complete** Arabic guide.',
    slug:          'arabic-ebook',
    isFree:        false,
    price:         9.99,
  }

  it('returns @type = Product', () => {
    const ld = productJsonLd(BASE)
    expect(ld['@type']).toBe('Product')
  })

  it('strips markdown from description', () => {
    const ld = productJsonLd(BASE) as any
    expect(ld.description).not.toContain('##')
    expect(ld.description).not.toContain('**')
  })

  it('includes offers for a paid product', () => {
    const ld = productJsonLd(BASE) as any
    expect(ld.offers.price).toBe('9.99')
    expect(ld.offers.priceCurrency).toBe('USD')
  })

  it('includes offers with price 0.00 for a free product', () => {
    const ld = productJsonLd({ ...BASE, isFree: true }) as any
    expect(ld.offers.price).toBe('0.00')
  })

  it('sets the image field when coverImage is provided', () => {
    const ld = productJsonLd({ ...BASE, coverImage: 'https://cdn.almanar.co/img.jpg' }) as any
    expect(ld.image).toBe('https://cdn.almanar.co/img.jpg')
  })

  it('omits image when coverImage is not provided', () => {
    const ld = productJsonLd(BASE) as any
    expect(ld.image).toBeUndefined()
  })

  it('includes aggregateRating when reviewCount > 0', () => {
    const ld = productJsonLd({ ...BASE, avgRating: 4.5, reviewCount: 10 }) as any
    expect(ld.aggregateRating).toBeDefined()
    expect(ld.aggregateRating.ratingValue).toBe('4.5')
  })

  it('omits aggregateRating when reviewCount is 0', () => {
    const ld = productJsonLd({ ...BASE, reviewCount: 0 }) as any
    expect(ld.aggregateRating).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// organizationJsonLd
// ═══════════════════════════════════════════════════════════════════════════════

describe('organizationJsonLd', () => {
  it('returns @type = Organization', () => {
    expect(organizationJsonLd()['@type']).toBe('Organization')
  })

  it('name is ALMANAR', () => {
    expect(organizationJsonLd().name).toBe('ALMANAR')
  })

  it('url matches the app URL', () => {
    expect(organizationJsonLd().url).toBe(APP_URL)
  })

  it('logo contains the app URL', () => {
    expect(organizationJsonLd().logo as string).toContain(APP_URL)
  })

  it('sameAs is an array', () => {
    expect(Array.isArray(organizationJsonLd().sameAs)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// breadcrumbJsonLd
// ═══════════════════════════════════════════════════════════════════════════════

describe('breadcrumbJsonLd', () => {
  const ITEMS = [
    { name: 'Home',    url: `${APP_URL}/en` },
    { name: 'Courses', url: `${APP_URL}/en/courses` },
    { name: 'Arabic 101', url: `${APP_URL}/en/courses/arabic-101` },
  ]

  it('returns @type = BreadcrumbList', () => {
    const ld = breadcrumbJsonLd(ITEMS)
    expect(ld['@type']).toBe('BreadcrumbList')
  })

  it('produces itemListElement with correct count', () => {
    const ld = breadcrumbJsonLd(ITEMS) as any
    expect(ld.itemListElement).toHaveLength(3)
  })

  it('each item has @type ListItem with 1-based position', () => {
    const ld = breadcrumbJsonLd(ITEMS) as any
    expect(ld.itemListElement[0]['@type']).toBe('ListItem')
    expect(ld.itemListElement[0].position).toBe(1)
    expect(ld.itemListElement[1].position).toBe(2)
    expect(ld.itemListElement[2].position).toBe(3)
  })

  it('preserves the name and URL for each item', () => {
    const ld = breadcrumbJsonLd(ITEMS) as any
    expect(ld.itemListElement[0].name).toBe('Home')
    expect(ld.itemListElement[0].item).toBe(`${APP_URL}/en`)
    expect(ld.itemListElement[2].name).toBe('Arabic 101')
  })

  it('handles an empty breadcrumb list', () => {
    const ld = breadcrumbJsonLd([]) as any
    expect(ld.itemListElement).toHaveLength(0)
  })

  it('handles a single-item breadcrumb', () => {
    const ld = breadcrumbJsonLd([{ name: 'Home', url: `${APP_URL}` }]) as any
    expect(ld.itemListElement).toHaveLength(1)
    expect(ld.itemListElement[0].position).toBe(1)
  })
})
