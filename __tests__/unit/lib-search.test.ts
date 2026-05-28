/**
 * Unit tests — src/lib/search.ts
 *
 * Covers: SEARCH_MIN_LEN guard, searchCourses, searchProducts,
 *         searchBundles, and the combined searchAll function.
 *
 * Prisma is mocked so tests run instantly without a real DB.
 * Price normalisation (Decimal → Number) is also verified.
 */

// ─── Mock: Prisma ─────────────────────────────────────────────────────────────

const mockCourseFindMany  = jest.fn()
const mockProductFindMany = jest.fn()
const mockBundleFindMany  = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    course:  { findMany: (...a: unknown[]) => mockCourseFindMany(...a)  },
    product: { findMany: (...a: unknown[]) => mockProductFindMany(...a) },
    bundle:  { findMany: (...a: unknown[]) => mockBundleFindMany(...a)  },
  },
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  SEARCH_MIN_LEN,
  SEARCH_MAX_PER_TYPE,
  searchCourses,
  searchProducts,
  searchBundles,
  searchAll,
} from '@/lib/search'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COURSE_ROW = {
  id: 'c1', slug: 'arabic-101',
  titleEn: 'Arabic 101', titleAr: 'عربي 101',
  shortDescEn: 'Intro', shortDescAr: 'مقدمة',
  thumbnail: null,
  price: '29.99',       // Prisma Decimal comes back as string
  isMemberOnly: false,
}

const PRODUCT_ROW = {
  id: 'p1', slug: 'ebook-arabic',
  titleEn: 'Arabic Ebook', titleAr: 'كتاب عربي',
  coverImage: null,
  price: '9.99',
  isFree: false,
}

const BUNDLE_ROW = {
  id: 'b1', slug: 'starter-bundle',
  titleEn: 'Starter Bundle', titleAr: 'حزمة البداية',
  price: '49.00',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCourseFindMany.mockResolvedValue([])
  mockProductFindMany.mockResolvedValue([])
  mockBundleFindMany.mockResolvedValue([])
})

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

describe('constants', () => {
  it('SEARCH_MIN_LEN is 2', () => {
    expect(SEARCH_MIN_LEN).toBe(2)
  })

  it('SEARCH_MAX_PER_TYPE is 8', () => {
    expect(SEARCH_MAX_PER_TYPE).toBe(8)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// searchCourses
// ═══════════════════════════════════════════════════════════════════════════════

describe('searchCourses', () => {
  it('returns an empty array without querying the DB when query < 2 chars', async () => {
    const result = await searchCourses('a')
    expect(result).toEqual([])
    expect(mockCourseFindMany).not.toHaveBeenCalled()
  })

  it('returns an empty array for an empty string', async () => {
    const result = await searchCourses('')
    expect(result).toEqual([])
    expect(mockCourseFindMany).not.toHaveBeenCalled()
  })

  it('queries the DB when query length ≥ 2', async () => {
    mockCourseFindMany.mockResolvedValue([COURSE_ROW])
    const result = await searchCourses('ar')
    expect(mockCourseFindMany).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(1)
  })

  it('normalises Prisma Decimal price to a JavaScript Number', async () => {
    mockCourseFindMany.mockResolvedValue([COURSE_ROW])
    const [course] = await searchCourses('arabic')
    expect(typeof course!.price).toBe('number')
    expect(course!.price).toBe(29.99)
  })

  it('passes take = SEARCH_MAX_PER_TYPE by default', async () => {
    mockCourseFindMany.mockResolvedValue([])
    await searchCourses('arabic')
    expect(mockCourseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: SEARCH_MAX_PER_TYPE }),
    )
  })

  it('accepts a custom limit', async () => {
    mockCourseFindMany.mockResolvedValue([])
    await searchCourses('arabic', 3)
    expect(mockCourseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    )
  })

  it('queries only published courses', async () => {
    mockCourseFindMany.mockResolvedValue([])
    await searchCourses('arabic')
    expect(mockCourseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isPublished: true }),
      }),
    )
  })

  it('returns the correct shape for each result', async () => {
    mockCourseFindMany.mockResolvedValue([COURSE_ROW])
    const [course] = await searchCourses('arabic')
    expect(course).toMatchObject({
      id:           'c1',
      slug:         'arabic-101',
      titleEn:      'Arabic 101',
      titleAr:      'عربي 101',
      isMemberOnly: false,
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// searchProducts
// ═══════════════════════════════════════════════════════════════════════════════

describe('searchProducts', () => {
  it('returns an empty array without querying the DB when query < 2 chars', async () => {
    const result = await searchProducts('x')
    expect(result).toEqual([])
    expect(mockProductFindMany).not.toHaveBeenCalled()
  })

  it('queries the DB when query length ≥ 2', async () => {
    mockProductFindMany.mockResolvedValue([PRODUCT_ROW])
    const result = await searchProducts('eb')
    expect(mockProductFindMany).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(1)
  })

  it('normalises price to a Number', async () => {
    mockProductFindMany.mockResolvedValue([PRODUCT_ROW])
    const [product] = await searchProducts('ebook')
    expect(typeof product!.price).toBe('number')
    expect(product!.price).toBe(9.99)
  })

  it('queries only published products', async () => {
    mockProductFindMany.mockResolvedValue([])
    await searchProducts('ebook')
    expect(mockProductFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isPublished: true }),
      }),
    )
  })

  it('returns the correct shape for each result', async () => {
    mockProductFindMany.mockResolvedValue([PRODUCT_ROW])
    const [product] = await searchProducts('ebook')
    expect(product).toMatchObject({
      id: 'p1', slug: 'ebook-arabic', isFree: false,
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// searchBundles
// ═══════════════════════════════════════════════════════════════════════════════

describe('searchBundles', () => {
  it('returns an empty array without querying the DB when query < 2 chars', async () => {
    const result = await searchBundles('s')
    expect(result).toEqual([])
    expect(mockBundleFindMany).not.toHaveBeenCalled()
  })

  it('queries the DB when query length ≥ 2', async () => {
    mockBundleFindMany.mockResolvedValue([BUNDLE_ROW])
    const result = await searchBundles('st')
    expect(mockBundleFindMany).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(1)
  })

  it('normalises price to a Number', async () => {
    mockBundleFindMany.mockResolvedValue([BUNDLE_ROW])
    const [bundle] = await searchBundles('starter')
    expect(typeof bundle!.price).toBe('number')
    expect(bundle!.price).toBe(49)
  })

  it('queries only published bundles', async () => {
    mockBundleFindMany.mockResolvedValue([])
    await searchBundles('bundle')
    expect(mockBundleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isPublished: true }),
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// searchAll — combined search
// ═══════════════════════════════════════════════════════════════════════════════

describe('searchAll', () => {
  it('returns empty results without querying the DB when query < 2 chars', async () => {
    const result = await searchAll('a')
    expect(result).toEqual({ q: 'a', courses: [], products: [], bundles: [], total: 0 })
    expect(mockCourseFindMany).not.toHaveBeenCalled()
    expect(mockProductFindMany).not.toHaveBeenCalled()
    expect(mockBundleFindMany).not.toHaveBeenCalled()
  })

  it('trims the query before checking the minimum length', async () => {
    // '  a  '.trim() = 'a' → length 1 → short-circuit
    const result = await searchAll('  a  ')
    expect(result.total).toBe(0)
    expect(mockCourseFindMany).not.toHaveBeenCalled()
  })

  it('returns a trimmed q in the response', async () => {
    const result = await searchAll('  arabic  ')
    expect(result.q).toBe('arabic')
  })

  it('queries all three models in parallel and combines results', async () => {
    mockCourseFindMany.mockResolvedValue([COURSE_ROW])
    mockProductFindMany.mockResolvedValue([PRODUCT_ROW])
    mockBundleFindMany.mockResolvedValue([BUNDLE_ROW])

    const result = await searchAll('arabic')

    expect(result.courses).toHaveLength(1)
    expect(result.products).toHaveLength(1)
    expect(result.bundles).toHaveLength(1)
    expect(result.total).toBe(3)
  })

  it('calculates total as the sum of all result counts', async () => {
    mockCourseFindMany.mockResolvedValue([COURSE_ROW, COURSE_ROW])
    mockProductFindMany.mockResolvedValue([PRODUCT_ROW])
    mockBundleFindMany.mockResolvedValue([])

    const result = await searchAll('arabic')
    expect(result.total).toBe(3)
  })

  it('returns total = 0 when all three searches return empty', async () => {
    const result = await searchAll('noresults')
    expect(result.total).toBe(0)
    expect(result.courses).toEqual([])
    expect(result.products).toEqual([])
    expect(result.bundles).toEqual([])
  })

  it('calls all three DB queries exactly once per searchAll call', async () => {
    await searchAll('test')
    expect(mockCourseFindMany).toHaveBeenCalledTimes(1)
    expect(mockProductFindMany).toHaveBeenCalledTimes(1)
    expect(mockBundleFindMany).toHaveBeenCalledTimes(1)
  })
})
