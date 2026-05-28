/**
 * Unit tests for src/lib/seo.ts
 *
 * Covers:
 *   ogImageUrl          — URL construction
 *   buildCourseMetadata — title, description, OG image fallback, canonical
 *   buildProductMetadata — description stripping, OG image fallback
 *   buildCertificateMetadata — OG image with recipient name
 *   courseJsonLd        — schema structure, offers, aggregateRating
 *   productJsonLd       — schema structure, free vs paid offers
 *   organizationJsonLd  — always returns org schema
 *   breadcrumbJsonLd    — correct positions and items
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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://almanar.co'

// ─── ogImageUrl ───────────────────────────────────────────────────────────────

describe('ogImageUrl()', () => {
  it('builds a URL with the correct base and params', () => {
    const url = ogImageUrl({ type: 'course', title: 'Hello World', locale: 'en' })
    expect(url).toMatch(/^https?:\/\//)
    expect(url).toContain('/api/og?')
    expect(url).toContain('type=course')
    expect(url).toContain('title=Hello+World')
    expect(url).toContain('locale=en')
  })

  it('encodes special characters in params', () => {
    const url = ogImageUrl({ title: 'مرحباً' })
    expect(url).toContain('%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B')
  })
})

// ─── buildCourseMetadata ──────────────────────────────────────────────────────

describe('buildCourseMetadata()', () => {
  const base = {
    titleEn:     'Parenting 101',
    titleAr:     'تربية الأطفال 101',
    shortDescEn: 'Learn modern parenting skills.',
    shortDescAr: 'تعلّم مهارات التربية الحديثة.',
    slug:        'parenting-101',
    thumbnail:   null,
    locale:      'en',
  }

  it('returns English title and description for en locale', () => {
    const meta = buildCourseMetadata(base)
    expect(meta.title).toContain('Parenting 101')
    expect(meta.description).toBe('Learn modern parenting skills.')
  })

  it('returns Arabic title and description for ar locale', () => {
    const meta = buildCourseMetadata({ ...base, locale: 'ar' })
    expect(meta.title).toContain('تربية الأطفال 101')
    expect(meta.description).toBe('تعلّم مهارات التربية الحديثة.')
  })

  it('falls back to generated OG image when no thumbnail', () => {
    const meta = buildCourseMetadata(base)
    const ogImages = (meta.openGraph as any)?.images as any[]
    expect(ogImages[0].url).toContain('/api/og')
    expect(ogImages[0].url).toContain('type=course')
  })

  it('uses thumbnail image when provided', () => {
    const meta = buildCourseMetadata({ ...base, thumbnail: 'https://cdn.example.com/thumb.jpg' })
    const ogImages = (meta.openGraph as any)?.images as any[]
    expect(ogImages[0].url).toBe('https://cdn.example.com/thumb.jpg')
  })

  it('includes canonical URL', () => {
    const meta = buildCourseMetadata(base)
    expect((meta.alternates as any)?.canonical).toContain(`/en/courses/parenting-101`)
  })

  it('has twitter card summary_large_image', () => {
    const meta = buildCourseMetadata(base)
    expect((meta.twitter as any)?.card).toBe('summary_large_image')
  })

  it('falls back to default description when both shortDescs are null', () => {
    const meta = buildCourseMetadata({ ...base, shortDescEn: null, shortDescAr: null })
    expect(typeof meta.description).toBe('string')
    expect((meta.description as string).length).toBeGreaterThan(10)
  })
})

// ─── buildProductMetadata ─────────────────────────────────────────────────────

describe('buildProductMetadata()', () => {
  const base = {
    titleEn:       'Montessori Activity Kit',
    titleAr:       'مجموعة أنشطة منتسوري',
    descriptionEn: '## About\nThis kit contains **50** activities for toddlers.',
    descriptionAr: 'تحتوي هذه المجموعة على **50** نشاطاً.',
    slug:          'montessori-kit',
    coverImage:    null,
    locale:        'en',
  }

  it('strips markdown from description', () => {
    const meta = buildProductMetadata(base)
    expect(meta.description).not.toContain('##')
    expect(meta.description).not.toContain('**')
    expect(meta.description).toContain('50')
  })

  it('truncates description to 160 chars', () => {
    const long = { ...base, descriptionEn: 'x'.repeat(300) }
    const meta = buildProductMetadata(long)
    expect((meta.description as string).length).toBeLessThanOrEqual(160)
  })

  it('uses coverImage when provided', () => {
    const meta = buildProductMetadata({ ...base, coverImage: 'https://cdn.example.com/kit.jpg' })
    const ogImages = (meta.openGraph as any)?.images as any[]
    expect(ogImages[0].url).toBe('https://cdn.example.com/kit.jpg')
  })

  it('falls back to generated OG image when no coverImage', () => {
    const meta = buildProductMetadata(base)
    const ogImages = (meta.openGraph as any)?.images as any[]
    expect(ogImages[0].url).toContain('/api/og')
  })

  it('includes canonical URL pointing to /store/slug', () => {
    const meta = buildProductMetadata(base)
    expect((meta.alternates as any)?.canonical).toContain('/store/montessori-kit')
  })
})

// ─── buildCertificateMetadata ─────────────────────────────────────────────────

describe('buildCertificateMetadata()', () => {
  const base = {
    userName:   'Fatima Al-Farsi',
    courseName: 'Parenting 101',
    code:       'cert-abc-123',
    locale:     'en',
  }

  it('includes recipient name in title and description', () => {
    const meta = buildCertificateMetadata(base)
    expect(meta.title).toContain('Parenting 101')
    expect(meta.description).toContain('Fatima Al-Farsi')
  })

  it('generates OG image with recipient name', () => {
    const meta = buildCertificateMetadata(base)
    const ogImages = (meta.openGraph as any)?.images as any[]
    const ogUrl = ogImages[0].url
    expect(ogUrl).toContain('/api/og')
    expect(ogUrl).toContain('type=certificate')
    expect(ogUrl).toContain('Fatima')
  })

  it('falls back to "Student" when userName is null', () => {
    const meta = buildCertificateMetadata({ ...base, userName: null })
    expect(meta.description).toContain('Student')
  })

  it('includes Arabic badge for ar locale', () => {
    const meta = buildCertificateMetadata({ ...base, locale: 'ar' })
    const ogImages = (meta.openGraph as any)?.images as any[]
    // URLSearchParams.get() fully decodes both %xx and + (space) encoding
    const badge = new URL(ogImages[0].url).searchParams.get('badge')
    expect(badge).toBe('شهادة إتمام')
  })
})

// ─── courseJsonLd ─────────────────────────────────────────────────────────────

describe('courseJsonLd()', () => {
  const base = {
    titleEn:  'Parenting 101',
    titleAr:  'تربية الأطفال 101',
    shortDescEn: 'Learn parenting skills.',
    slug:     'parenting-101',
    price:    49,
    isFree:   false,
  }

  it('has correct @type and @context', () => {
    const ld = courseJsonLd(base)
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('Course')
  })

  it('includes offers for paid course', () => {
    const ld = courseJsonLd(base) as any
    expect(ld.offers).toBeDefined()
    expect(ld.offers.price).toBe('49.00')
    expect(ld.offers.priceCurrency).toBe('USD')
  })

  it('omits offers for free course', () => {
    const ld = courseJsonLd({ ...base, isFree: true, price: 0 }) as any
    expect(ld.offers).toBeUndefined()
  })

  it('includes aggregateRating when reviewCount > 0', () => {
    const ld = courseJsonLd({ ...base, avgRating: 4.5, reviewCount: 12 }) as any
    expect(ld.aggregateRating).toBeDefined()
    expect(ld.aggregateRating.ratingValue).toBe('4.5')
    expect(ld.aggregateRating.reviewCount).toBe(12)
  })

  it('omits aggregateRating when reviewCount is 0', () => {
    const ld = courseJsonLd({ ...base, reviewCount: 0, avgRating: 0 }) as any
    expect(ld.aggregateRating).toBeUndefined()
  })

  it('includes both English and Arabic names', () => {
    const ld = courseJsonLd(base) as any
    expect(ld.name).toBe('Parenting 101')
    expect(ld.alternateName).toBe('تربية الأطفال 101')
  })
})

// ─── productJsonLd ────────────────────────────────────────────────────────────

describe('productJsonLd()', () => {
  const base = {
    titleEn:       'Activity Kit',
    titleAr:       'مجموعة أنشطة',
    descriptionEn: '## About\nGreat **kit** for kids.',
    slug:          'activity-kit',
    price:         29,
    isFree:        false,
  }

  it('has @type Product', () => {
    const ld = productJsonLd(base)
    expect(ld['@type']).toBe('Product')
  })

  it('strips markdown from description', () => {
    const ld = productJsonLd(base) as any
    expect(ld.description).not.toContain('##')
    expect(ld.description).not.toContain('**')
  })

  it('includes paid offer with correct price', () => {
    const ld = productJsonLd(base) as any
    expect(ld.offers.price).toBe('29.00')
    expect(ld.offers.priceCurrency).toBe('USD')
  })

  it('offers price 0.00 for free products', () => {
    const ld = productJsonLd({ ...base, isFree: true, price: 0 }) as any
    expect(ld.offers.price).toBe('0.00')
  })

  it('includes image when coverImage is provided', () => {
    const ld = productJsonLd({ ...base, coverImage: 'https://cdn.example.com/img.jpg' }) as any
    expect(ld.image).toBe('https://cdn.example.com/img.jpg')
  })

  it('omits image when coverImage is null', () => {
    const ld = productJsonLd({ ...base, coverImage: null }) as any
    expect(ld.image).toBeUndefined()
  })

  it('includes aggregateRating when reviewCount > 0', () => {
    const ld = productJsonLd({ ...base, avgRating: 4.8, reviewCount: 5 }) as any
    expect(ld.aggregateRating.ratingValue).toBe('4.8')
  })
})

// ─── organizationJsonLd ───────────────────────────────────────────────────────

describe('organizationJsonLd()', () => {
  it('returns Organization schema with correct name and a valid URL', () => {
    const ld = organizationJsonLd() as any
    expect(ld['@type']).toBe('Organization')
    expect(ld.name).toBe('ALMANAR')
    // url should be a non-empty HTTP(S) URL — exact host varies by env
    expect(ld.url).toMatch(/^https?:\/\/.+/)
  })
})

// ─── breadcrumbJsonLd ─────────────────────────────────────────────────────────

describe('breadcrumbJsonLd()', () => {
  it('produces correct BreadcrumbList structure', () => {
    const ld = breadcrumbJsonLd([
      { name: 'Home',    url: `${APP_URL}/en` },
      { name: 'Courses', url: `${APP_URL}/en/courses` },
      { name: 'Parenting 101', url: `${APP_URL}/en/courses/parenting-101` },
    ]) as any

    expect(ld['@type']).toBe('BreadcrumbList')
    expect(ld.itemListElement).toHaveLength(3)
    expect(ld.itemListElement[0].position).toBe(1)
    expect(ld.itemListElement[2].position).toBe(3)
    expect(ld.itemListElement[1].name).toBe('Courses')
  })
})
