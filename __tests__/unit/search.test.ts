/**
 * Unit tests for site-wide search.
 *
 * Covers:
 *   lib/search  — searchCourses, searchProducts, searchBundles, searchAll
 *   GET /api/search — empty query, short query, type filter, error handling
 */

import { NextRequest } from 'next/server'

/* ─── mock: Prisma ───────────────────────────────────────────────────────── */
const mockCourseFindMany  = jest.fn()
const mockProductFindMany = jest.fn()
const mockBundleFindMany  = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    course:  { findMany: (...a: unknown[]) => mockCourseFindMany(...a) },
    product: { findMany: (...a: unknown[]) => mockProductFindMany(...a) },
    bundle:  { findMany: (...a: unknown[]) => mockBundleFindMany(...a) },
  },
}))

/* ─── dynamic imports ────────────────────────────────────────────────────── */
let searchCourses:  typeof import('@/lib/search').searchCourses
let searchProducts: typeof import('@/lib/search').searchProducts
let searchBundles:  typeof import('@/lib/search').searchBundles
let searchAll:      typeof import('@/lib/search').searchAll
let GET:            (req: NextRequest) => Promise<Response>

beforeAll(async () => {
  const lib   = await import('@/lib/search')
  const route = await import('@/app/api/search/route')
  searchCourses  = lib.searchCourses
  searchProducts = lib.searchProducts
  searchBundles  = lib.searchBundles
  searchAll      = lib.searchAll
  GET            = route.GET
})

beforeEach(() => {
  jest.clearAllMocks()
  // Default: return empty arrays
  mockCourseFindMany.mockResolvedValue([])
  mockProductFindMany.mockResolvedValue([])
  mockBundleFindMany.mockResolvedValue([])
})

/* ─── helpers ────────────────────────────────────────────────────────────── */
function makeReq(q: string, type?: string): NextRequest {
  const url = `http://localhost/api/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}`
  return new NextRequest(url)
}

const COURSE_ROW = { id: 'c1', slug: 'parenting-101', titleEn: 'Parenting 101', titleAr: 'تربية الأطفال', shortDescEn: 'Learn modern parenting.', shortDescAr: null, thumbnail: null, price: 49, isMemberOnly: false }
const PRODUCT_ROW = { id: 'p1', slug: 'montessori-kit', titleEn: 'Montessori Kit', titleAr: 'مجموعة منتسوري', coverImage: null, price: 19, isFree: false }
const BUNDLE_ROW  = { id: 'b1', slug: 'starter-bundle', titleEn: 'Starter Bundle',  titleAr: 'حزمة البداية', price: 59 }

// ─── searchCourses ────────────────────────────────────────────────────────────

describe('searchCourses()', () => {
  it('returns empty array for query shorter than SEARCH_MIN_LEN', async () => {
    const result = await searchCourses('a')
    expect(result).toEqual([])
    expect(mockCourseFindMany).not.toHaveBeenCalled()
  })

  it('queries with isPublished: true and mode: insensitive', async () => {
    mockCourseFindMany.mockResolvedValue([COURSE_ROW])
    await searchCourses('parenting')
    expect(mockCourseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isPublished: true }),
      }),
    )
    // mode: 'insensitive' must be present somewhere in the OR conditions
    const call = mockCourseFindMany.mock.calls[0]![0]
    expect(JSON.stringify(call)).toContain('insensitive')
  })

  it('converts Decimal price to number', async () => {
    mockCourseFindMany.mockResolvedValue([{ ...COURSE_ROW, price: '49.00' }])
    const results = await searchCourses('parenting')
    expect(typeof results[0]!.price).toBe('number')
    expect(results[0]!.price).toBe(49)
  })

  it('returns multiple results', async () => {
    mockCourseFindMany.mockResolvedValue([COURSE_ROW, { ...COURSE_ROW, id: 'c2', slug: 'advanced-parenting' }])
    const results = await searchCourses('parenting')
    expect(results).toHaveLength(2)
  })

  it('respects the limit parameter', async () => {
    mockCourseFindMany.mockResolvedValue([COURSE_ROW])
    await searchCourses('parenting', 3)
    expect(mockCourseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    )
  })
})

// ─── searchProducts ───────────────────────────────────────────────────────────

describe('searchProducts()', () => {
  it('returns empty for short query', async () => {
    const result = await searchProducts('x')
    expect(result).toEqual([])
  })

  it('queries with isPublished: true', async () => {
    mockProductFindMany.mockResolvedValue([PRODUCT_ROW])
    await searchProducts('montessori')
    expect(mockProductFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isPublished: true }) }),
    )
  })

  it('converts Decimal price to number', async () => {
    mockProductFindMany.mockResolvedValue([{ ...PRODUCT_ROW, price: '19.00' }])
    const results = await searchProducts('montessori')
    expect(typeof results[0]!.price).toBe('number')
  })
})

// ─── searchBundles ────────────────────────────────────────────────────────────

describe('searchBundles()', () => {
  it('returns empty for short query', async () => {
    expect(await searchBundles('')).toEqual([])
  })

  it('converts Decimal price to number', async () => {
    mockBundleFindMany.mockResolvedValue([{ ...BUNDLE_ROW, price: '59.00' }])
    const results = await searchBundles('bundle')
    expect(typeof results[0]!.price).toBe('number')
  })
})

// ─── searchAll ────────────────────────────────────────────────────────────────

describe('searchAll()', () => {
  it('returns empty results for very short query', async () => {
    const result = await searchAll('a')
    expect(result.total).toBe(0)
    expect(result.courses).toEqual([])
    expect(result.products).toEqual([])
    expect(result.bundles).toEqual([])
  })

  it('calls all three search functions in parallel', async () => {
    mockCourseFindMany.mockResolvedValue([COURSE_ROW])
    mockProductFindMany.mockResolvedValue([PRODUCT_ROW])
    mockBundleFindMany.mockResolvedValue([BUNDLE_ROW])
    const result = await searchAll('parenting')
    expect(result.total).toBe(3)
    expect(mockCourseFindMany).toHaveBeenCalledTimes(1)
    expect(mockProductFindMany).toHaveBeenCalledTimes(1)
    expect(mockBundleFindMany).toHaveBeenCalledTimes(1)
  })

  it('trims whitespace from query', async () => {
    mockCourseFindMany.mockResolvedValue([])
    mockProductFindMany.mockResolvedValue([])
    mockBundleFindMany.mockResolvedValue([])
    const result = await searchAll('  parenting  ')
    expect(result.q).toBe('parenting')
  })
})

// ─── GET /api/search ──────────────────────────────────────────────────────────

describe('GET /api/search', () => {
  it('returns empty results for missing q param', async () => {
    const res  = await GET(makeReq(''))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.total).toBe(0)
  })

  it('returns empty for query under min length', async () => {
    const res  = await GET(makeReq('x'))
    const json = await res.json()
    expect(json.total).toBe(0)
    expect(mockCourseFindMany).not.toHaveBeenCalled()
  })

  it('returns search results for valid query', async () => {
    mockCourseFindMany.mockResolvedValue([COURSE_ROW])
    mockProductFindMany.mockResolvedValue([])
    mockBundleFindMany.mockResolvedValue([])
    const res  = await GET(makeReq('parenting'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.total).toBe(1)
    expect(json.courses).toHaveLength(1)
    expect(json.courses[0].slug).toBe('parenting-101')
  })

  it('filters to courses only when type=course', async () => {
    mockCourseFindMany.mockResolvedValue([COURSE_ROW])
    const res  = await GET(makeReq('parenting', 'course'))
    const json = await res.json()
    expect(json.products).toEqual([])
    expect(json.bundles).toEqual([])
    expect(mockProductFindMany).not.toHaveBeenCalled()
    expect(mockBundleFindMany).not.toHaveBeenCalled()
  })

  it('filters to products only when type=product', async () => {
    mockProductFindMany.mockResolvedValue([PRODUCT_ROW])
    const res  = await GET(makeReq('montessori', 'product'))
    const json = await res.json()
    expect(json.courses).toEqual([])
    expect(json.bundles).toEqual([])
    expect(mockCourseFindMany).not.toHaveBeenCalled()
  })

  it('filters to bundles only when type=bundle', async () => {
    mockBundleFindMany.mockResolvedValue([BUNDLE_ROW])
    const res  = await GET(makeReq('starter', 'bundle'))
    const json = await res.json()
    expect(json.courses).toEqual([])
    expect(json.products).toEqual([])
    expect(mockCourseFindMany).not.toHaveBeenCalled()
  })

  it('treats unknown type as "all"', async () => {
    mockCourseFindMany.mockResolvedValue([])
    mockProductFindMany.mockResolvedValue([])
    mockBundleFindMany.mockResolvedValue([])
    await GET(makeReq('test', 'invalid'))
    expect(mockCourseFindMany).toHaveBeenCalledTimes(1)
    expect(mockProductFindMany).toHaveBeenCalledTimes(1)
    expect(mockBundleFindMany).toHaveBeenCalledTimes(1)
  })

  it('returns 500 on DB error', async () => {
    mockCourseFindMany.mockRejectedValue(new Error('DB down'))
    const res = await GET(makeReq('parenting'))
    expect(res.status).toBe(500)
  })
})
