/**
 * Unit tests for /api/admin/plans/* and /api/admin/subscriptions routes.
 *
 * Covers:
 *   GET    /api/admin/plans                  — list
 *   POST   /api/admin/plans                  — create
 *   GET    /api/admin/plans/[planId]         — detail
 *   PATCH  /api/admin/plans/[planId]         — update
 *   DELETE /api/admin/plans/[planId]         — soft-delete
 *   GET    /api/admin/subscriptions          — paginated list + status filter
 */

import { NextRequest } from 'next/server'

/* ─── mock: adminGuard ───────────────────────────────────────────────────── */
const mockRequireAdminSession = jest.fn()

jest.mock('@/lib/adminGuard', () => ({
  requireAdminSession: (...a: unknown[]) => mockRequireAdminSession(...a),
}))

/* ─── mock: Prisma ───────────────────────────────────────────────────────── */
const mockPlanFindMany    = jest.fn()
const mockPlanFindFirst   = jest.fn()
const mockPlanFindUnique  = jest.fn()
const mockPlanCreate      = jest.fn()
const mockPlanUpdate      = jest.fn()
const mockSubFindMany     = jest.fn()
const mockSubCount        = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    membershipPlan: {
      findMany:   (...a: unknown[]) => mockPlanFindMany(...a),
      findFirst:  (...a: unknown[]) => mockPlanFindFirst(...a),
      findUnique: (...a: unknown[]) => mockPlanFindUnique(...a),
      create:     (...a: unknown[]) => mockPlanCreate(...a),
      update:     (...a: unknown[]) => mockPlanUpdate(...a),
    },
    subscription: {
      findMany: (...a: unknown[]) => mockSubFindMany(...a),
      count:    (...a: unknown[]) => mockSubCount(...a),
    },
  },
}))

/* ─── shared ─────────────────────────────────────────────────────────────── */
const ADMIN_SESSION = {
  session: { user: { id: 'admin-1', role: 'ADMIN', email: 'admin@example.com' } },
  error: null,
}

const UNAUTHED = {
  session: null,
  error:   new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}

function makeReq(method: string, body?: unknown, url = 'http://localhost/api/admin/plans'): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

const VALID_PLAN = {
  nameEn:               'ALMANAR Pro',
  nameAr:               'المنار برو',
  monthlyPrice:         '9.99',
  annualPrice:          '89.99',
  stripePriceIdMonthly: 'price_monthly_123',
  stripePriceIdAnnual:  'price_annual_456',
}

beforeEach(() => {
  jest.resetAllMocks()
  mockRequireAdminSession.mockResolvedValue(ADMIN_SESSION)
})

/* ══════════════════════════════════════════════════════════════════════════
   GET /api/admin/plans
══════════════════════════════════════════════════════════════════════════ */
describe('GET /api/admin/plans', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GET: (req: NextRequest) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/plans/route')
    GET = mod.GET
  })

  it('returns 401 when not admin', async () => {
    mockRequireAdminSession.mockResolvedValueOnce(UNAUTHED)
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(401)
  })

  it('returns list of plans', async () => {
    const plans = [{ id: 'p1', nameEn: 'Pro', nameAr: 'برو', _count: { subscriptions: 5 } }]
    mockPlanFindMany.mockResolvedValue(plans)
    const res  = await GET(makeReq('GET'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.plans).toEqual(plans)
  })

  it('returns empty array when DB throws', async () => {
    mockPlanFindMany.mockRejectedValue(new Error('db'))
    const res  = await GET(makeReq('GET'))
    const json = await res.json()
    expect(json.plans).toEqual([])
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   POST /api/admin/plans
══════════════════════════════════════════════════════════════════════════ */
describe('POST /api/admin/plans', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: (req: NextRequest) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/plans/route')
    POST = mod.POST
  })

  it('returns 401 when not admin', async () => {
    mockRequireAdminSession.mockResolvedValueOnce(UNAUTHED)
    const res = await POST(makeReq('POST', VALID_PLAN))
    expect(res.status).toBe(401)
  })

  it('returns 400 if nameEn is missing', async () => {
    const res = await POST(makeReq('POST', { ...VALID_PLAN, nameEn: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 if nameAr is missing', async () => {
    const res = await POST(makeReq('POST', { ...VALID_PLAN, nameAr: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 if stripePriceIdMonthly is missing', async () => {
    const res = await POST(makeReq('POST', { ...VALID_PLAN, stripePriceIdMonthly: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 if stripePriceIdAnnual is missing', async () => {
    const res = await POST(makeReq('POST', { ...VALID_PLAN, stripePriceIdAnnual: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 if monthly price is negative', async () => {
    const res = await POST(makeReq('POST', { ...VALID_PLAN, monthlyPrice: '-1' }))
    expect(res.status).toBe(400)
  })

  it('returns 409 if Stripe price ID already in use', async () => {
    mockPlanFindFirst.mockResolvedValue({ id: 'existing' })
    const res = await POST(makeReq('POST', VALID_PLAN))
    expect(res.status).toBe(409)
  })

  it('creates plan and returns 201 with id', async () => {
    mockPlanFindFirst.mockResolvedValue(null)
    mockPlanCreate.mockResolvedValue({ id: 'new-plan' })

    const res  = await POST(makeReq('POST', VALID_PLAN))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.plan.id).toBe('new-plan')
    expect(mockPlanCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nameEn:        'ALMANAR Pro',
          nameAr:        'المنار برو',
          monthlyPrice:  9.99,
          annualPrice:   89.99,
        }),
      }),
    )
  })

  it('stores features arrays', async () => {
    mockPlanFindFirst.mockResolvedValue(null)
    mockPlanCreate.mockResolvedValue({ id: 'p2' })

    const body = {
      ...VALID_PLAN,
      featuresEn: ['Feature A', 'Feature B'],
      featuresAr: ['ميزة أ', 'ميزة ب'],
    }
    await POST(makeReq('POST', body))
    const data = mockPlanCreate.mock.calls[0][0].data
    expect(data.featuresEn).toEqual(['Feature A', 'Feature B'])
    expect(data.featuresAr).toEqual(['ميزة أ', 'ميزة ب'])
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   GET /api/admin/plans/[planId]
══════════════════════════════════════════════════════════════════════════ */
describe('GET /api/admin/plans/[planId]', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GET: (req: NextRequest, ctx: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/plans/[planId]/route')
    GET = mod.GET
  })

  it('returns 401 when not admin', async () => {
    mockRequireAdminSession.mockResolvedValueOnce(UNAUTHED)
    const res = await GET(makeReq('GET'), { params: Promise.resolve({ planId: 'p1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when plan not found', async () => {
    mockPlanFindUnique.mockResolvedValue(null)
    const res = await GET(makeReq('GET'), { params: Promise.resolve({ planId: 'ghost' }) })
    expect(res.status).toBe(404)
  })

  it('returns plan data', async () => {
    const plan = { id: 'p1', nameEn: 'Pro', _count: { subscriptions: 3 } }
    mockPlanFindUnique.mockResolvedValue(plan)
    const res  = await GET(makeReq('GET'), { params: Promise.resolve({ planId: 'p1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.plan).toEqual(plan)
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   PATCH /api/admin/plans/[planId]
══════════════════════════════════════════════════════════════════════════ */
describe('PATCH /api/admin/plans/[planId]', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PATCH: (req: NextRequest, ctx: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/plans/[planId]/route')
    PATCH = mod.PATCH
  })

  it('returns 401 when not admin', async () => {
    mockRequireAdminSession.mockResolvedValueOnce(UNAUTHED)
    const res = await PATCH(makeReq('PATCH', {}), { params: Promise.resolve({ planId: 'p1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when body has no fields', async () => {
    const res = await PATCH(makeReq('PATCH', {}), { params: Promise.resolve({ planId: 'p1' }) })
    expect(res.status).toBe(400)
  })

  it('updates nameEn and returns plan', async () => {
    const updated = { id: 'p1', isActive: true, nameEn: 'New Name' }
    mockPlanUpdate.mockResolvedValue(updated)

    const res  = await PATCH(makeReq('PATCH', { nameEn: 'New Name' }), { params: Promise.resolve({ planId: 'p1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.plan.nameEn).toBe('New Name')
    expect(mockPlanUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data:  expect.objectContaining({ nameEn: 'New Name' }),
      }),
    )
  })

  it('converts prices to numbers', async () => {
    mockPlanUpdate.mockResolvedValue({ id: 'p1', isActive: true, nameEn: 'Pro' })
    await PATCH(makeReq('PATCH', { monthlyPrice: '14.99', annualPrice: '129.99' }), {
      params: Promise.resolve({ planId: 'p1' }),
    })
    const data = mockPlanUpdate.mock.calls[0][0].data
    expect(data.monthlyPrice).toBe(14.99)
    expect(data.annualPrice).toBe(129.99)
  })

  it('can toggle isActive', async () => {
    mockPlanUpdate.mockResolvedValue({ id: 'p1', isActive: false, nameEn: 'Pro' })
    await PATCH(makeReq('PATCH', { isActive: false }), { params: Promise.resolve({ planId: 'p1' }) })
    const data = mockPlanUpdate.mock.calls[0][0].data
    expect(data.isActive).toBe(false)
  })

  it('returns 404 when plan not found', async () => {
    mockPlanUpdate.mockResolvedValue(null)
    const res = await PATCH(makeReq('PATCH', { nameEn: 'X' }), { params: Promise.resolve({ planId: 'ghost' }) })
    expect(res.status).toBe(404)
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   DELETE /api/admin/plans/[planId]
══════════════════════════════════════════════════════════════════════════ */
describe('DELETE /api/admin/plans/[planId]', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let DELETE: (req: NextRequest, ctx: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/plans/[planId]/route')
    DELETE = mod.DELETE
  })

  it('returns 401 when not admin', async () => {
    mockRequireAdminSession.mockResolvedValueOnce(UNAUTHED)
    const res = await DELETE(makeReq('DELETE'), { params: Promise.resolve({ planId: 'p1' }) })
    expect(res.status).toBe(401)
  })

  it('soft-deletes (sets isActive=false) and returns { ok: true }', async () => {
    mockPlanUpdate.mockResolvedValue({ id: 'p1', isActive: false })
    const res  = await DELETE(makeReq('DELETE'), { params: Promise.resolve({ planId: 'p1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(mockPlanUpdate).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data:  { isActive: false },
    })
  })

  it('returns { ok: true } even if update throws', async () => {
    mockPlanUpdate.mockRejectedValue(new Error('not found'))
    const res  = await DELETE(makeReq('DELETE'), { params: Promise.resolve({ planId: 'ghost' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   GET /api/admin/subscriptions
══════════════════════════════════════════════════════════════════════════ */
describe('GET /api/admin/subscriptions', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GET: (req: NextRequest) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/subscriptions/route')
    GET = mod.GET
  })

  function makeSubReq(qs = ''): NextRequest {
    return new NextRequest(`http://localhost/api/admin/subscriptions${qs}`)
  }

  it('returns 401 when not admin', async () => {
    mockRequireAdminSession.mockResolvedValueOnce(UNAUTHED)
    const res = await GET(makeSubReq())
    expect(res.status).toBe(401)
  })

  it('returns paginated subscriptions with defaults', async () => {
    const subs = [{ id: 's1', status: 'ACTIVE', user: { name: 'Ahmad' }, plan: { nameEn: 'Pro' } }]
    mockSubFindMany.mockResolvedValue(subs)
    mockSubCount.mockResolvedValue(1)

    const res  = await GET(makeSubReq())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.subscriptions).toEqual(subs)
    expect(json.pagination.page).toBe(1)
    expect(json.pagination.pageSize).toBe(25)
    expect(json.pagination.total).toBe(1)
  })

  it('filters by status when valid status param is provided', async () => {
    mockSubFindMany.mockResolvedValue([])
    mockSubCount.mockResolvedValue(0)

    await GET(makeSubReq('?status=active'))

    const whereArg = mockSubFindMany.mock.calls[0][0].where
    expect(whereArg.status).toBe('ACTIVE')
  })

  it('ignores invalid status param', async () => {
    mockSubFindMany.mockResolvedValue([])
    mockSubCount.mockResolvedValue(0)

    await GET(makeSubReq('?status=invalidstatus'))

    const whereArg = mockSubFindMany.mock.calls[0][0].where
    expect(whereArg.status).toBeUndefined()
  })

  it('handles pagination params', async () => {
    mockSubFindMany.mockResolvedValue([])
    mockSubCount.mockResolvedValue(100)

    const res  = await GET(makeSubReq('?page=3&pageSize=10'))
    const json = await res.json()
    expect(json.pagination.page).toBe(3)
    expect(json.pagination.pageSize).toBe(10)
    expect(json.pagination.totalPages).toBe(10)

    const callArgs = mockSubFindMany.mock.calls[0][0]
    expect(callArgs.skip).toBe(20)
    expect(callArgs.take).toBe(10)
  })

  it('returns empty array when DB throws', async () => {
    mockSubFindMany.mockRejectedValue(new Error('db'))
    mockSubCount.mockRejectedValue(new Error('db'))

    const res  = await GET(makeSubReq())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.subscriptions).toEqual([])
    expect(json.pagination.total).toBe(0)
  })
})
