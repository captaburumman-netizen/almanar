/**
 * GET /api/admin/subscriptions — paginated list of all subscriptions
 *
 * Query params:
 *   status  — filter by SubscriptionStatus enum value (optional)
 *   page    — 1-based (default 1)
 *   pageSize — max 100 (default 25)
 */
import { NextRequest, NextResponse }  from 'next/server'
import { requireAdminSession }        from '@/lib/adminGuard'
import { db }                         from '@/lib/db'
import type { SubscriptionStatus }    from '@prisma/client'

const VALID_STATUSES: SubscriptionStatus[] = [
  'ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIALING', 'UNPAID', 'INCOMPLETE',
]

export async function GET(req: NextRequest) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { searchParams } = req.nextUrl
  const statusParam = searchParams.get('status')?.toUpperCase() as SubscriptionStatus | undefined
  const page        = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize    = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10)))

  const statusFilter =
    statusParam && VALID_STATUSES.includes(statusParam)
      ? { status: statusParam }
      : {}

  const [subscriptions, total] = await Promise.all([
    db.subscription.findMany({
      where:   statusFilter,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * pageSize,
      take:    pageSize,
      select: {
        id:                   true,
        status:               true,
        interval:             true,
        currentPeriodEnd:     true,
        cancelAtPeriodEnd:    true,
        createdAt:            true,
        stripeSubscriptionId: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        plan: {
          select: { id: true, nameEn: true, nameAr: true },
        },
      },
    }).catch(() => []),
    db.subscription.count({ where: statusFilter }).catch(() => 0),
  ])

  return NextResponse.json({
    subscriptions,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  })
}
