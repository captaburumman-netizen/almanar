/**
 * GET /api/search?q=...&type=all|course|product|bundle
 *
 * Public endpoint — no auth required.
 * Used by the search bar for instant suggestions (debounced client calls).
 *
 * Returns JSON matching SearchResults.
 * Empty query → { q: '', courses: [], products: [], bundles: [], total: 0 }
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  searchAll,
  searchCourses,
  searchProducts,
  searchBundles,
  SEARCH_MIN_LEN,
} from '@/lib/search'

const VALID_TYPES = ['all', 'course', 'product', 'bundle'] as const
type SearchType = typeof VALID_TYPES[number]

// Cache for 60 s in CDN — safe since results are pub/published only
export const revalidate = 60

export async function GET(req: NextRequest) {
  const sp   = new URL(req.url).searchParams
  const q    = sp.get('q') ?? ''
  const type = (VALID_TYPES.includes(sp.get('type') as SearchType)
    ? sp.get('type')
    : 'all') as SearchType

  if (q.trim().length < SEARCH_MIN_LEN) {
    return NextResponse.json({ q: q.trim(), courses: [], products: [], bundles: [], total: 0 })
  }

  try {
    let result

    if (type === 'course') {
      const courses = await searchCourses(q.trim())
      result = { q: q.trim(), courses, products: [], bundles: [], total: courses.length }
    } else if (type === 'product') {
      const products = await searchProducts(q.trim())
      result = { q: q.trim(), courses: [], products, bundles: [], total: products.length }
    } else if (type === 'bundle') {
      const bundles = await searchBundles(q.trim())
      result = { q: q.trim(), courses: [], products: [], bundles, total: bundles.length }
    } else {
      result = await searchAll(q.trim())
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 },
    )
  }
}
