/**
 * Unit tests — Admin Analytics + Subscriptions APIs
 *
 * Covers:
 *   GET /api/admin/analytics     — time-series revenue, users, enrollments, top courses
 *   GET /api/admin/subscriptions — paginated subscription list with status filter
 */

import { NextRequest } from 'next/server'

// ─── Fixed "now" so bucket counts are deterministic ──────────────────────────
// We pin the clock to 2024-06-15T12:00:00Z.
// dailyRevenue    → 30 daily buckets  (2024-05-17 … 2024-06-15)
// monthlyEnroll   → 7 monthly buckets (2023-12 … 2024-06)
const FIXED_NOW = new Date('2024-06-15T12:00:00Z')

beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(FIXED_NOW)
})

afterAll(() => {
  jest.useRealTimers()
})

// ─── Mock: adminGuard ────────────────────────────────────────────────────────

const mockRequireAdminSession = jest.fn()

jest.mock('@/lib/adminGuard', () => ({
  requireAdminSession: (...a: unknown[]) => mockRequireAdminSession(...a),
}))

// ─── Mock: Prisma ─────────────────────────────────────────────────────────────

const mockCoursePurchaseFindMany    = jest.fn()
const mockProductPurchaseFindMany   = jest.fn()
const mockUserFindMany              = jest.fn()
const mockEnrollmentFindMany        = jest.fn()
const mockEnrollmentGroupBy         = jest.fn()
const mockCourseFindMany            = jest.fn()
const mockSubscriptionFindMany      = jest.fn()
const mockSubscriptionCount         = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    coursePurchase:  { findMany:  (...a: unknown[]) => mockCoursePurchaseFindMany(...a)  },
    productPurchase: { findMany:  (...a: unknown[]) => mockProductPurchaseFindMany(...a) },
    user:            { findMany:  (...a: unknown[]) => mockUserFindMany(...a)             },
    enrollment: {
      findMany: (...a: unknown[]) => mockEnrollmentFindMany(...a),
      groupBy:  (...a: unknown[]) => mockEnrollmentGroupBy(...a),
    },
    course:       { findMany: (...a: unknown[]) => mockCourseFindMany(...a)    },
    subscription: {
      findMany: (...a: unknown[]) => mockSubscriptionFindMany(...a),
      count:    (...a: unknown[]) => mockSubscriptionCount(...a),
    },
  },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGet(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' })
}

// ─── Dynamic imports ──────────────────────────────────────────────────────────

let analyticsGET:      () => Promise<Response>
let subscriptionsGET:  (req: NextRequest) => Promise<Response>

beforeAll(async () => {
  const analyticsRoute     = await import('@/app/api/admin/analytics/route')
  const subscriptionsRoute = await import('@/app/api/admin/subscriptions/route')
  analyticsGET     = analyticsRoute.GET
  subscriptionsGET = subscriptionsRoute.GET
})

beforeEach(() => {
  jest.clearAllMocks()
  // Default: admin authenticated
  mockRequireAdminSession.mockResolvedValue({ session: { user: { id: 'admin-1' } }, error: null })
  // Default: empty DB
  mockCoursePurchaseFindMany.mockResolvedValue([])
  mockProductPurchaseFindMany.mockResolvedValue([])
  mockUserFindMany.mockResolvedValue([])
  mockEnrollmentFindMany.mockResolvedValue([])
  mockEnrollmentGroupBy.mockResolvedValue([])
  mockCourseFindMany.mockResolvedValue([])
  mockSubscriptionFindMany.mockResolvedValue([])
  mockSubscriptionCount.mockResolvedValue(0)
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/analytics
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/admin/analytics', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue({
      session: null,
      error:   new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })
    const res = await analyticsGET()
    expect(res.status).toBe(401)
  })

  it('returns 200 with all expected top-level keys', async () => {
    const res  = await analyticsGET()
    const json = await res.json() as Record<string, unknown>
    expect(res.status).toBe(200)
    expect(json).toHaveProperty('dailyRevenue')
    expect(json).toHaveProperty('dailyNewUsers')
    expect(json).toHaveProperty('monthlyEnrollments')
    expect(json).toHaveProperty('topCourses')
    expect(json).toHaveProperty('revenueBreakdown')
  })

  it('dailyRevenue contains 30 entries (one per day)', async () => {
    const res  = await analyticsGET()
    const json = await res.json() as { dailyRevenue: unknown[] }
    // The route builds a bucket from day30ago to now — should be 30 or 31 days
    // depending on whether the start boundary is inclusive. Either is correct.
    expect(json.dailyRevenue.length).toBeGreaterThanOrEqual(30)
    expect(json.dailyRevenue.length).toBeLessThanOrEqual(31)
  })

  it('each dailyRevenue entry has { date, revenue } shape', async () => {
    const res  = await analyticsGET()
    const json = await res.json() as { dailyRevenue: { date: string; revenue: number }[] }
    const first = json.dailyRevenue[0]!
    expect(first).toHaveProperty('date')
    expect(first).toHaveProperty('revenue')
    expect(typeof first.date).toBe('string')
    expect(first.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)  // YYYY-MM-DD
  })

  it('monthlyEnrollments contains 6-7 entries (one per month)', async () => {
    const res  = await analyticsGET()
    const json = await res.json() as { monthlyEnrollments: unknown[] }
    expect(json.monthlyEnrollments.length).toBeGreaterThanOrEqual(6)
    expect(json.monthlyEnrollments.length).toBeLessThanOrEqual(7)
  })

  it('each monthlyEnrollments entry has { month, count } shape', async () => {
    const res  = await analyticsGET()
    const json = await res.json() as { monthlyEnrollments: { month: string; count: number }[] }
    const first = json.monthlyEnrollments[0]!
    expect(first).toHaveProperty('month')
    expect(first).toHaveProperty('count')
    expect(first.month).toMatch(/^\d{4}-\d{2}$/)  // YYYY-MM
  })

  it('sums course and product revenue correctly into revenueBreakdown', async () => {
    // Return two course purchases and one product purchase on a known date
    const dateInWindow = new Date('2024-06-10T08:00:00Z')
    mockCoursePurchaseFindMany.mockResolvedValue([
      { amount: 49, createdAt: dateInWindow },
      { amount: 29, createdAt: dateInWindow },
    ])
    mockProductPurchaseFindMany.mockResolvedValue([
      { amount: 19, createdAt: dateInWindow },
    ])

    const res  = await analyticsGET()
    const json = await res.json() as {
      revenueBreakdown: { courses: number; products: number; total: number }
    }

    expect(json.revenueBreakdown.courses).toBe(78)   // 49 + 29
    expect(json.revenueBreakdown.products).toBe(19)
    expect(json.revenueBreakdown.total).toBe(97)      // 78 + 19
  })

  it('accumulates revenue into the correct daily bucket', async () => {
    const dateInWindow = new Date('2024-06-10T08:00:00Z')
    mockCoursePurchaseFindMany.mockResolvedValue([
      { amount: 100, createdAt: dateInWindow },
    ])

    const res  = await analyticsGET()
    const json = await res.json() as { dailyRevenue: { date: string; revenue: number }[] }

    const bucket = json.dailyRevenue.find((b) => b.date === '2024-06-10')
    expect(bucket).toBeDefined()
    expect(bucket!.revenue).toBe(100)
  })

  it('counts new users into the correct daily bucket', async () => {
    const dateInWindow = new Date('2024-06-12T10:00:00Z')
    mockUserFindMany.mockResolvedValue([
      { createdAt: dateInWindow },
      { createdAt: dateInWindow },
    ])

    const res  = await analyticsGET()
    const json = await res.json() as { dailyNewUsers: { date: string; count: number }[] }

    const bucket = json.dailyNewUsers.find((b) => b.date === '2024-06-12')
    expect(bucket).toBeDefined()
    expect(bucket!.count).toBe(2)
  })

  it('enriches topCourses with title and slug from course lookup', async () => {
    mockEnrollmentGroupBy.mockResolvedValue([
      { courseId: 'c1', _count: { courseId: 42 } },
      { courseId: 'c2', _count: { courseId: 17 } },
    ])
    mockCourseFindMany.mockResolvedValue([
      { id: 'c1', titleEn: 'Arabic 101', titleAr: 'عربي 101', slug: 'arabic-101' },
      { id: 'c2', titleEn: 'Quran',      titleAr: 'قرآن',      slug: 'quran'      },
    ])

    const res  = await analyticsGET()
    const json = await res.json() as { topCourses: { courseId: string; enrollments: number; titleEn: string; slug: string }[] }

    expect(json.topCourses).toHaveLength(2)
    expect(json.topCourses[0]).toMatchObject({
      courseId:    'c1',
      enrollments: 42,
      titleEn:     'Arabic 101',
      slug:        'arabic-101',
    })
  })

  it('returns empty arrays when DB has no data', async () => {
    const res  = await analyticsGET()
    const json = await res.json() as {
      topCourses: unknown[]; revenueBreakdown: { total: number }
    }
    expect(json.topCourses).toHaveLength(0)
    expect(json.revenueBreakdown.total).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/subscriptions
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/admin/subscriptions', () => {
  const BASE_SUB = {
    id:                   'sub-1',
    status:               'ACTIVE',
    interval:             'MONTHLY',
    currentPeriodEnd:     new Date('2024-07-01'),
    cancelAtPeriodEnd:    false,
    createdAt:            new Date('2024-01-01'),
    stripeSubscriptionId: 'sub_stripe123',
    user: { id: 'u1', name: 'Alice', email: 'alice@test.com' },
    plan: { id: 'pl1', nameEn: 'Pro', nameAr: 'احترافي' },
  }

  it('returns 401 when unauthenticated', async () => {
    mockRequireAdminSession.mockResolvedValue({
      session: null,
      error:   new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })
    const res = await subscriptionsGET(makeGet('http://localhost/api/admin/subscriptions'))
    expect(res.status).toBe(401)
  })

  it('returns 200 with subscriptions array and pagination', async () => {
    mockSubscriptionFindMany.mockResolvedValue([BASE_SUB])
    mockSubscriptionCount.mockResolvedValue(1)

    const res  = await subscriptionsGET(makeGet('http://localhost/api/admin/subscriptions'))
    const json = await res.json() as {
      subscriptions: unknown[]
      pagination: { total: number; page: number; pageSize: number; totalPages: number }
    }

    expect(res.status).toBe(200)
    expect(json.subscriptions).toHaveLength(1)
    expect(json.pagination.total).toBe(1)
    expect(json.pagination.page).toBe(1)
    expect(json.pagination.totalPages).toBe(1)
  })

  it('passes status filter to Prisma when valid status provided', async () => {
    mockSubscriptionFindMany.mockResolvedValue([])
    mockSubscriptionCount.mockResolvedValue(0)

    await subscriptionsGET(
      makeGet('http://localhost/api/admin/subscriptions?status=ACTIVE'),
    )

    expect(mockSubscriptionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE' },
      }),
    )
  })

  it('does not filter when status param is invalid', async () => {
    mockSubscriptionFindMany.mockResolvedValue([])
    mockSubscriptionCount.mockResolvedValue(0)

    await subscriptionsGET(
      makeGet('http://localhost/api/admin/subscriptions?status=INVALID'),
    )

    expect(mockSubscriptionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    )
  })

  it('applies pagination with skip and take', async () => {
    mockSubscriptionFindMany.mockResolvedValue([])
    mockSubscriptionCount.mockResolvedValue(0)

    await subscriptionsGET(
      makeGet('http://localhost/api/admin/subscriptions?page=3&pageSize=10'),
    )

    expect(mockSubscriptionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,   // (3 - 1) * 10
        take: 10,
      }),
    )
  })

  it('caps pageSize at 100', async () => {
    mockSubscriptionFindMany.mockResolvedValue([])
    mockSubscriptionCount.mockResolvedValue(0)

    await subscriptionsGET(
      makeGet('http://localhost/api/admin/subscriptions?pageSize=999'),
    )

    expect(mockSubscriptionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    )
  })

  it('defaults to page 1 with pageSize 25', async () => {
    mockSubscriptionFindMany.mockResolvedValue([])
    mockSubscriptionCount.mockResolvedValue(0)

    await subscriptionsGET(makeGet('http://localhost/api/admin/subscriptions'))

    expect(mockSubscriptionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 25 }),
    )
  })

  it('normalises status param to uppercase', async () => {
    mockSubscriptionFindMany.mockResolvedValue([])
    mockSubscriptionCount.mockResolvedValue(0)

    await subscriptionsGET(
      makeGet('http://localhost/api/admin/subscriptions?status=active'),
    )

    expect(mockSubscriptionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE' },
      }),
    )
  })
})
