/**
 * Unit tests — src/lib/validations.ts
 *
 * Tests every Zod schema's happy path, boundary values, and rejection cases.
 * Covers: registerSchema, forgotPasswordSchema, resetPasswordSchema,
 *         createCourseSchema, createLessonSchema, createProductSchema,
 *         presignedUrlSchema.
 *
 * No mocking needed — all schemas are pure synchronous validators.
 */

import {
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createCourseSchema,
  createLessonSchema,
  createProductSchema,
  presignedUrlSchema,
} from '@/lib/validations'

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Parse and assert success; return the data. */
function ok<T>(schema: { parse: (v: unknown) => T }, input: unknown): T {
  return schema.parse(input)
}

/** Parse and assert failure; return the flat error messages. */
function fail(schema: { safeParse: (v: unknown) => { success: boolean; error?: { flatten: () => { fieldErrors: Record<string, string[]>; formErrors: string[] } } } }, input: unknown) {
  const result = schema.safeParse(input)
  expect(result.success).toBe(false)
  return result.error!.flatten()
}

// ═══════════════════════════════════════════════════════════════════════════════
// registerSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('registerSchema', () => {
  const VALID = { name: 'Alice', email: 'alice@test.com', password: 'SecurePass1' }

  it('accepts a valid registration payload', () => {
    const data = ok(registerSchema, VALID)
    expect(data.name).toBe('Alice')
    expect(data.email).toBe('alice@test.com')
    expect(data.locale).toBe('ar')  // default
  })

  it('accepts locale "en" explicitly', () => {
    expect(ok(registerSchema, { ...VALID, locale: 'en' }).locale).toBe('en')
  })

  it('rejects a name shorter than 2 characters', () => {
    const errs = fail(registerSchema, { ...VALID, name: 'A' })
    expect(errs.fieldErrors.name?.length).toBeGreaterThan(0)
  })

  it('rejects a name longer than 100 characters', () => {
    const errs = fail(registerSchema, { ...VALID, name: 'A'.repeat(101) })
    expect(errs.fieldErrors.name?.length).toBeGreaterThan(0)
  })

  it('rejects an invalid email address', () => {
    const errs = fail(registerSchema, { ...VALID, email: 'not-an-email' })
    expect(errs.fieldErrors.email?.length).toBeGreaterThan(0)
  })

  it('rejects a password shorter than 8 characters', () => {
    const errs = fail(registerSchema, { ...VALID, password: 'short' })
    expect(errs.fieldErrors.password?.length).toBeGreaterThan(0)
  })

  it('rejects a password longer than 100 characters', () => {
    const errs = fail(registerSchema, { ...VALID, password: 'p'.repeat(101) })
    expect(errs.fieldErrors.password?.length).toBeGreaterThan(0)
  })

  it('rejects a locale that is not "ar" or "en"', () => {
    const errs = fail(registerSchema, { ...VALID, locale: 'fr' })
    expect(errs.fieldErrors.locale?.length).toBeGreaterThan(0)
  })

  it('accepts a name of exactly 2 characters (boundary)', () => {
    expect(() => ok(registerSchema, { ...VALID, name: 'Li' })).not.toThrow()
  })

  it('accepts a password of exactly 8 characters (boundary)', () => {
    expect(() => ok(registerSchema, { ...VALID, password: 'exactly8' })).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// forgotPasswordSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('forgotPasswordSchema', () => {
  it('accepts a valid email', () => {
    const data = ok(forgotPasswordSchema, { email: 'user@example.com' })
    expect(data.email).toBe('user@example.com')
  })

  it('rejects an invalid email', () => {
    const errs = fail(forgotPasswordSchema, { email: 'bad' })
    expect(errs.fieldErrors.email?.length).toBeGreaterThan(0)
  })

  it('rejects when email is missing', () => {
    const errs = fail(forgotPasswordSchema, {})
    expect(errs.fieldErrors.email?.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// resetPasswordSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('resetPasswordSchema', () => {
  const VALID = { token: 'tok-abc', password: 'NewSecure1!', confirm: 'NewSecure1!' }

  it('accepts valid matching passwords', () => {
    const data = ok(resetPasswordSchema, VALID)
    expect(data.token).toBe('tok-abc')
  })

  it('rejects when password and confirm do not match', () => {
    const errs = fail(resetPasswordSchema, { ...VALID, confirm: 'Different1!' })
    expect(errs.fieldErrors.confirm?.length).toBeGreaterThan(0)
  })

  it('rejects a password shorter than 8 characters', () => {
    const errs = fail(resetPasswordSchema, { ...VALID, password: 'short', confirm: 'short' })
    expect(errs.fieldErrors.password?.length).toBeGreaterThan(0)
  })

  it('rejects when token is empty', () => {
    const errs = fail(resetPasswordSchema, { ...VALID, token: '' })
    expect(errs.fieldErrors.token?.length).toBeGreaterThan(0)
  })

  it('rejects when confirm is empty', () => {
    const errs = fail(resetPasswordSchema, { ...VALID, confirm: '' })
    // Zod refine fires after field validation; confirm.min(1) catches empty string
    expect(errs.fieldErrors.confirm?.length || errs.formErrors.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// createCourseSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('createCourseSchema', () => {
  const VALID = {
    titleEn:       'Arabic for Beginners',
    titleAr:       'العربية للمبتدئين',
    descriptionEn: 'A comprehensive introduction to Arabic.',
    descriptionAr: 'مقدمة شاملة للغة العربية.',
    shortDescEn:   'Learn Arabic fast.',
    shortDescAr:   'تعلم العربية بسرعة.',
    price:         29.99,
  }

  it('accepts a valid course payload with defaults', () => {
    const data = ok(createCourseSchema, VALID)
    expect(data.isMemberOnly).toBe(false)
    expect(data.level).toBe('BEGINNER')
  })

  it('rejects titleEn shorter than 3 characters', () => {
    const errs = fail(createCourseSchema, { ...VALID, titleEn: 'Hi' })
    expect(errs.fieldErrors.titleEn?.length).toBeGreaterThan(0)
  })

  it('rejects titleAr shorter than 3 characters', () => {
    const errs = fail(createCourseSchema, { ...VALID, titleAr: 'هه' })
    expect(errs.fieldErrors.titleAr?.length).toBeGreaterThan(0)
  })

  it('rejects descriptionEn shorter than 10 characters', () => {
    const errs = fail(createCourseSchema, { ...VALID, descriptionEn: 'Too short' })
    expect(errs.fieldErrors.descriptionEn?.length).toBeGreaterThan(0)
  })

  it('rejects a negative price', () => {
    const errs = fail(createCourseSchema, { ...VALID, price: -1 })
    expect(errs.fieldErrors.price?.length).toBeGreaterThan(0)
  })

  it('accepts price = 0 (free course)', () => {
    expect(() => ok(createCourseSchema, { ...VALID, price: 0 })).not.toThrow()
  })

  it('rejects an invalid level enum value', () => {
    const errs = fail(createCourseSchema, { ...VALID, level: 'EXPERT' })
    expect(errs.fieldErrors.level?.length).toBeGreaterThan(0)
  })

  it('accepts all valid level values', () => {
    for (const level of ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const) {
      expect(() => ok(createCourseSchema, { ...VALID, level })).not.toThrow()
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// createLessonSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('createLessonSchema', () => {
  const VALID = {
    titleEn:  'Introduction',
    titleAr:  'مقدمة',
    position: 1,
  }

  it('accepts a minimal valid lesson', () => {
    const data = ok(createLessonSchema, VALID)
    expect(data.isPreview).toBe(false)
  })

  it('rejects titleEn shorter than 2 characters', () => {
    const errs = fail(createLessonSchema, { ...VALID, titleEn: 'X' })
    expect(errs.fieldErrors.titleEn?.length).toBeGreaterThan(0)
  })

  it('rejects position less than 1', () => {
    const errs = fail(createLessonSchema, { ...VALID, position: 0 })
    expect(errs.fieldErrors.position?.length).toBeGreaterThan(0)
  })

  it('rejects a negative duration', () => {
    const errs = fail(createLessonSchema, { ...VALID, duration: -1 })
    expect(errs.fieldErrors.duration?.length).toBeGreaterThan(0)
  })

  it('accepts duration = 0', () => {
    expect(() => ok(createLessonSchema, { ...VALID, duration: 0 })).not.toThrow()
  })

  it('rejects a non-integer duration', () => {
    const errs = fail(createLessonSchema, { ...VALID, duration: 1.5 })
    expect(errs.fieldErrors.duration?.length).toBeGreaterThan(0)
  })

  it('accepts optional fields as absent', () => {
    expect(() => ok(createLessonSchema, VALID)).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// createProductSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('createProductSchema', () => {
  const VALID = {
    titleEn:       'Montessori Cards',
    titleAr:       'بطاقات مونتيسوري',
    descriptionEn: 'Educational printable cards for children.',
    descriptionAr: 'بطاقات تعليمية للأطفال.',
    price:         9.99,
    category:      'PRINTABLE',
  }

  it('accepts a valid product payload with defaults', () => {
    const data = ok(createProductSchema, VALID)
    expect(data.language).toBe('BILINGUAL')
  })

  it('rejects titleEn shorter than 2 characters', () => {
    const errs = fail(createProductSchema, { ...VALID, titleEn: 'X' })
    expect(errs.fieldErrors.titleEn?.length).toBeGreaterThan(0)
  })

  it('rejects descriptionEn shorter than 10 characters', () => {
    const errs = fail(createProductSchema, { ...VALID, descriptionEn: 'Short' })
    expect(errs.fieldErrors.descriptionEn?.length).toBeGreaterThan(0)
  })

  it('rejects a negative price', () => {
    const errs = fail(createProductSchema, { ...VALID, price: -5 })
    expect(errs.fieldErrors.price?.length).toBeGreaterThan(0)
  })

  it('rejects an invalid category', () => {
    const errs = fail(createProductSchema, { ...VALID, category: 'INVALID' })
    expect(errs.fieldErrors.category?.length).toBeGreaterThan(0)
  })

  it('accepts all valid category values', () => {
    for (const category of ['EBOOK', 'PRINTABLE', 'MONTESSORI_MATERIAL', 'TOY_AFFILIATE'] as const) {
      expect(() => ok(createProductSchema, { ...VALID, category })).not.toThrow()
    }
  })

  it('rejects an invalid language', () => {
    const errs = fail(createProductSchema, { ...VALID, language: 'DE' })
    expect(errs.fieldErrors.language?.length).toBeGreaterThan(0)
  })

  it('accepts all valid language values', () => {
    for (const language of ['EN', 'AR', 'BILINGUAL'] as const) {
      expect(() => ok(createProductSchema, { ...VALID, language })).not.toThrow()
    }
  })

  it('rejects an invalid affiliateUrl (not a URL)', () => {
    const errs = fail(createProductSchema, { ...VALID, affiliateUrl: 'not-a-url' })
    expect(errs.fieldErrors.affiliateUrl?.length).toBeGreaterThan(0)
  })

  it('accepts a valid affiliateUrl', () => {
    expect(() =>
      ok(createProductSchema, { ...VALID, affiliateUrl: 'https://amazon.com/product/xyz' }),
    ).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// presignedUrlSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('presignedUrlSchema', () => {
  const VALID = {
    filename:    'lecture-1.mp4',
    contentType: 'video/mp4',
    folder:      'courses',
    entityId:    'course-abc123',
  }

  it('accepts a valid presigned URL request', () => {
    expect(() => ok(presignedUrlSchema, VALID)).not.toThrow()
  })

  it('rejects an empty filename', () => {
    const errs = fail(presignedUrlSchema, { ...VALID, filename: '' })
    expect(errs.fieldErrors.filename?.length).toBeGreaterThan(0)
  })

  it('rejects an empty contentType', () => {
    const errs = fail(presignedUrlSchema, { ...VALID, contentType: '' })
    expect(errs.fieldErrors.contentType?.length).toBeGreaterThan(0)
  })

  it('rejects an invalid folder', () => {
    const errs = fail(presignedUrlSchema, { ...VALID, folder: 'uploads' })
    expect(errs.fieldErrors.folder?.length).toBeGreaterThan(0)
  })

  it('accepts all valid folder values', () => {
    for (const folder of ['courses', 'products', 'temp'] as const) {
      expect(() => ok(presignedUrlSchema, { ...VALID, folder })).not.toThrow()
    }
  })

  it('rejects an empty entityId', () => {
    const errs = fail(presignedUrlSchema, { ...VALID, entityId: '' })
    expect(errs.fieldErrors.entityId?.length).toBeGreaterThan(0)
  })
})
