/**
 * Site-wide search — query courses, products, and bundles.
 *
 * Uses Prisma's case-insensitive `contains` filter (maps to ILIKE in PostgreSQL).
 * Only published items are returned. Short queries (< 2 chars) return empty.
 */
import { db } from '@/lib/db'

export const SEARCH_MIN_LEN = 2   // minimum characters to trigger a search
export const SEARCH_MAX_PER_TYPE = 8  // max results per category

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CourseResult {
  id:           string
  slug:         string
  titleEn:      string
  titleAr:      string
  shortDescEn:  string | null
  shortDescAr:  string | null
  thumbnail:    string | null
  price:        number
  isMemberOnly: boolean
}

export interface ProductResult {
  id:         string
  slug:       string
  titleEn:    string
  titleAr:    string
  coverImage: string | null
  price:      number
  isFree:     boolean
}

export interface BundleResult {
  id:      string
  slug:    string
  titleEn: string
  titleAr: string
  price:   number
}

export interface SearchResults {
  q:        string
  courses:  CourseResult[]
  products: ProductResult[]
  bundles:  BundleResult[]
  total:    number
}

// ─── Course search ────────────────────────────────────────────────────────────

export async function searchCourses(
  q: string,
  limit = SEARCH_MAX_PER_TYPE,
): Promise<CourseResult[]> {
  if (q.length < SEARCH_MIN_LEN) return []

  const rows = await db.course.findMany({
    where: {
      isPublished: true,
      OR: [
        { titleEn:    { contains: q, mode: 'insensitive' } },
        { titleAr:    { contains: q, mode: 'insensitive' } },
        { shortDescEn:{ contains: q, mode: 'insensitive' } },
        { shortDescAr:{ contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true, slug: true,
      titleEn: true, titleAr: true,
      shortDescEn: true, shortDescAr: true,
      thumbnail: true, price: true, isMemberOnly: true,
    },
    take:    limit,
    orderBy: { createdAt: 'desc' },
  })

  return rows.map((r) => ({ ...r, price: Number(r.price) }))
}

// ─── Product search ───────────────────────────────────────────────────────────

export async function searchProducts(
  q: string,
  limit = SEARCH_MAX_PER_TYPE,
): Promise<ProductResult[]> {
  if (q.length < SEARCH_MIN_LEN) return []

  const rows = await db.product.findMany({
    where: {
      isPublished: true,
      OR: [
        { titleEn:      { contains: q, mode: 'insensitive' } },
        { titleAr:      { contains: q, mode: 'insensitive' } },
        { descriptionEn:{ contains: q, mode: 'insensitive' } },
        { descriptionAr:{ contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true, slug: true,
      titleEn: true, titleAr: true,
      coverImage: true, price: true, isFree: true,
    },
    take:    limit,
    orderBy: { createdAt: 'desc' },
  })

  return rows.map((r) => ({ ...r, price: Number(r.price) }))
}

// ─── Bundle search ────────────────────────────────────────────────────────────

export async function searchBundles(
  q: string,
  limit = SEARCH_MAX_PER_TYPE,
): Promise<BundleResult[]> {
  if (q.length < SEARCH_MIN_LEN) return []

  const rows = await db.bundle.findMany({
    where: {
      isPublished: true,
      OR: [
        { titleEn:      { contains: q, mode: 'insensitive' } },
        { titleAr:      { contains: q, mode: 'insensitive' } },
        { descriptionEn:{ contains: q, mode: 'insensitive' } },
        { descriptionAr:{ contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true, slug: true,
      titleEn: true, titleAr: true,
      price: true,
    },
    take:    limit,
    orderBy: { createdAt: 'desc' },
  })

  return rows.map((r) => ({ ...r, price: Number(r.price) }))
}

// ─── Combined search ──────────────────────────────────────────────────────────

export async function searchAll(q: string): Promise<SearchResults> {
  const trimmed = q.trim()

  if (trimmed.length < SEARCH_MIN_LEN) {
    return { q: trimmed, courses: [], products: [], bundles: [], total: 0 }
  }

  const [courses, products, bundles] = await Promise.all([
    searchCourses(trimmed),
    searchProducts(trimmed),
    searchBundles(trimmed),
  ])

  return {
    q:       trimmed,
    courses,
    products,
    bundles,
    total:   courses.length + products.length + bundles.length,
  }
}
