/**
 * Unit tests — src/lib/utils.ts
 *
 * All functions are pure (no I/O), so no mocking is needed.
 * Covers: cn, getField, formatPrice, formatDuration, formatDate,
 *         slugify, buildDownloadUrl, getErrorMessage.
 */

import {
  cn,
  getField,
  formatPrice,
  formatDuration,
  formatDate,
  slugify,
  buildDownloadUrl,
  getErrorMessage,
} from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════════════════════
// cn — Tailwind class merge
// ═══════════════════════════════════════════════════════════════════════════════

describe('cn', () => {
  it('returns a single class unchanged', () => {
    expect(cn('text-red-500')).toBe('text-red-500')
  })

  it('merges multiple classes into a single string', () => {
    expect(cn('flex', 'items-center', 'gap-4')).toBe('flex items-center gap-4')
  })

  it('drops falsy values (undefined, null, false, empty string)', () => {
    expect(cn('p-4', undefined, null, false, '', 'mt-2')).toBe('p-4 mt-2')
  })

  it('resolves Tailwind conflicts — last wins', () => {
    // twMerge keeps the last conflicting class
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })

  it('handles conditional class objects', () => {
    const active = true
    const result = cn('base', active && 'active', !active && 'inactive')
    expect(result).toBe('base active')
  })

  it('returns an empty string when given no arguments', () => {
    expect(cn()).toBe('')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// getField — bilingual field picker
// ═══════════════════════════════════════════════════════════════════════════════

describe('getField', () => {
  const obj = {
    titleEn: 'Arabic 101',
    titleAr: 'عربي 101',
    nameEn:  'ALMANAR',
    nameAr:  'المنار',
  }

  it('returns the Arabic field when locale is "ar"', () => {
    expect(getField(obj, 'title', 'ar')).toBe('عربي 101')
  })

  it('returns the English field when locale is "en"', () => {
    expect(getField(obj, 'title', 'en')).toBe('Arabic 101')
  })

  it('defaults to the English field for unrecognised locales', () => {
    expect(getField(obj, 'title', 'fr')).toBe('Arabic 101')
  })

  it('works with other field prefixes (e.g. "name")', () => {
    expect(getField(obj, 'name', 'ar')).toBe('المنار')
    expect(getField(obj, 'name', 'en')).toBe('ALMANAR')
  })

  it('returns an empty string when the field is absent', () => {
    expect(getField({}, 'missing', 'en')).toBe('')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// formatPrice — Intl.NumberFormat wrapper
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatPrice', () => {
  it('formats a whole-number USD price in English without decimals', () => {
    expect(formatPrice(10, 'en', 'USD')).toBe('$10')
  })

  it('formats a fractional USD price in English with 2 decimal places', () => {
    expect(formatPrice(9.99, 'en', 'USD')).toBe('$9.99')
  })

  it('handles a numeric string input', () => {
    expect(formatPrice('29.99', 'en', 'USD')).toBe('$29.99')
  })

  it('formats zero correctly', () => {
    // 0 % 1 === 0 → no decimals
    expect(formatPrice(0, 'en', 'USD')).toBe('$0')
  })

  it('produces a non-empty string for the Arabic locale', () => {
    const result = formatPrice(99, 'ar', 'USD')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// formatDuration — seconds → human-readable
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatDuration', () => {
  describe('English locale', () => {
    it('formats minutes only when < 1 hour', () => {
      expect(formatDuration(90, 'en')).toBe('1m')      // 1m30s → 1m (whole minutes)
      expect(formatDuration(300, 'en')).toBe('5m')
      expect(formatDuration(3540, 'en')).toBe('59m')
    })

    it('formats hours only when minutes = 0', () => {
      expect(formatDuration(3600, 'en')).toBe('1h')
      expect(formatDuration(7200, 'en')).toBe('2h')
    })

    it('formats hours and minutes together', () => {
      expect(formatDuration(3660, 'en')).toBe('1h 1m')
      expect(formatDuration(5400, 'en')).toBe('1h 30m')
    })

    it('returns "0m" for zero seconds', () => {
      expect(formatDuration(0, 'en')).toBe('0m')
    })
  })

  describe('Arabic locale', () => {
    it('formats minutes only in Arabic', () => {
      expect(formatDuration(300, 'ar')).toBe('5 دقيقة')
    })

    it('formats hours only in Arabic', () => {
      expect(formatDuration(3600, 'ar')).toBe('1 ساعة')
    })

    it('formats hours and minutes together in Arabic', () => {
      expect(formatDuration(5400, 'ar')).toBe('1 ساعة 30 دقيقة')
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// formatDate — locale-aware date display
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatDate', () => {
  const ISO = '2024-06-15'

  it('returns a non-empty string for the English locale', () => {
    const result = formatDate(ISO, 'en')
    expect(typeof result).toBe('string')
    expect(result).toContain('2024')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns a non-empty string for the Arabic locale', () => {
    const result = formatDate(ISO, 'ar')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('accepts a Date object as well as a string', () => {
    // Use UTC noon so the date stays in June regardless of the test runner's timezone
    const date = new Date('2024-06-15T12:00:00.000Z')
    const result = formatDate(date, 'en')
    expect(result).toContain('2024')
  })

  it('produces different output for different locales', () => {
    const en = formatDate(ISO, 'en')
    const ar = formatDate(ISO, 'ar')
    expect(en).not.toBe(ar)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// slugify — URL-safe slug generation
// ═══════════════════════════════════════════════════════════════════════════════

describe('slugify', () => {
  it('lowercases the input', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('replaces spaces with hyphens', () => {
    expect(slugify('Learn Arabic Online')).toBe('learn-arabic-online')
  })

  it('strips special characters', () => {
    expect(slugify('Course! (#1)')).toBe('course-1')
  })

  it('collapses multiple hyphens into one', () => {
    expect(slugify('a---b')).toBe('a-b')
    expect(slugify('one  two   three')).toBe('one-two-three')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  leading trailing  ')).toBe('leading-trailing')
  })

  it('strips Arabic/Unicode characters (leaves empty string for Arabic-only)', () => {
    // Arabic chars are stripped; only ASCII remains
    const result = slugify('منهج عربي')
    expect(result).toBe('')
  })

  it('strips diacritics from Latin characters', () => {
    expect(slugify('Ñoño')).toBe('nono')
    expect(slugify('résumé')).toBe('resume')
  })

  it('handles numbers correctly', () => {
    expect(slugify('Level 101')).toBe('level-101')
  })

  it('returns an empty string for an empty input', () => {
    expect(slugify('')).toBe('')
  })

  it('handles mixed Arabic and English (keeps only the ASCII part)', () => {
    expect(slugify('Course أ 2024')).toBe('course-2024')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// buildDownloadUrl — URL builder with env fallback
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildDownloadUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalEnv
  })

  it('uses the provided baseUrl when given', () => {
    const url = buildDownloadUrl('tok-abc', 'https://app.almanar.co')
    expect(url).toBe('https://app.almanar.co/api/downloads/tok-abc')
  })

  it('falls back to NEXT_PUBLIC_APP_URL when baseUrl is omitted', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://staging.almanar.co'
    const url = buildDownloadUrl('tok-xyz')
    expect(url).toBe('https://staging.almanar.co/api/downloads/tok-xyz')
  })

  it('falls back to localhost:3000 when env var is unset', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    const url = buildDownloadUrl('tok-local')
    expect(url).toBe('http://localhost:3000/api/downloads/tok-local')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// getErrorMessage — unknown error → string
// ═══════════════════════════════════════════════════════════════════════════════

describe('getErrorMessage', () => {
  it('returns the message from an Error instance', () => {
    expect(getErrorMessage(new Error('something broke'))).toBe('something broke')
  })

  it('returns the string directly when error is a string', () => {
    expect(getErrorMessage('network timeout')).toBe('network timeout')
  })

  it('returns the fallback message for null', () => {
    expect(getErrorMessage(null)).toBe('An unexpected error occurred')
  })

  it('returns the fallback message for undefined', () => {
    expect(getErrorMessage(undefined)).toBe('An unexpected error occurred')
  })

  it('returns the fallback message for an arbitrary object', () => {
    expect(getErrorMessage({ code: 500 })).toBe('An unexpected error occurred')
  })

  it('returns the fallback message for numbers', () => {
    expect(getErrorMessage(42)).toBe('An unexpected error occurred')
  })
})
