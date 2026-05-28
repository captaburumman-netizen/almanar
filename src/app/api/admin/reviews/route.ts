/**
 * GET /api/admin/reviews?status=PENDING|APPROVED|REJECTED&page=1&pageSize=20
 *
 * Paginated list of reviews for admin moderation.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession }       from '@/lib/adminGuard'
import { db }                        from '@/lib/db'
import type { ReviewStatus }         from '@prisma/client'

const VALID_STATUSES: ReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED']

export async function GET(req: NextRequest) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { searchParams } = req.nextUrl
  const statusParam = searchParams.get('status') as ReviewStatus | null
  const page        = Math.max(1, parseInt(searchParams.get('page')     ?? '1',  10))
  const pageSize    = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20', 10))

  const statusFilter = statusParam && VALID_STATUSES.includes(statusParam)
    ? statusParam
    : undefined

  const where = statusFilter ? { status: statusFilter } : {}

  const [reviews, total] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * pageSize,
      take:    pageSize,
      select: {
        id:        true,
        rating:    true,
        comment:   true,
        status:    true,
        createdAt: true,
        user:    { select: { id: true, name: true, email: true } },
        course:  { select: { id: true, titleEn: true, slug: true } },
        product: { select: { id: true, titleEn: true, slug: true } },
      },
    }).catch(() => []),
    db.review.count({ where }).catch(() => 0),
  ])

  return NextResponse.json({
    reviews,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  })
}
