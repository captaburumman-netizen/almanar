/**
 * GET /api/admin/users
 *
 * Paginated, searchable list of all users.
 *
 * Query params:
 *   q        — search by name or email (case-insensitive)
 *   role     — "STUDENT" | "ADMIN" (omit for all)
 *   page     — 1-based page number (default 1)
 *   pageSize — items per page (default 25, max 100)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession }       from '@/lib/adminGuard'
import { db }                        from '@/lib/db'
import type { Role }                 from '@prisma/client'

export async function GET(req: NextRequest) {
  const { error } = await requireAdminSession()
  if (error) return error

  const sp       = req.nextUrl.searchParams
  const q        = sp.get('q')?.trim() ?? ''
  const roleParam = sp.get('role') as Role | null
  const page     = Math.max(1, Number(sp.get('page') ?? 1))
  const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize') ?? 25)))
  const skip     = (page - 1) * pageSize

  const where = {
    ...(q ? {
      OR: [
        { name:  { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
      ],
    } : {}),
    ...(roleParam ? { role: roleParam } : {}),
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id:              true,
        name:            true,
        email:           true,
        role:            true,
        createdAt:       true,
        preferredLocale: true,
        _count: {
          select: {
            enrollments:      true,
            productPurchases: { where: { status: 'COMPLETED' } },
          },
        },
        subscription: {
          select: { status: true, plan: { select: { nameEn: true } } },
        },
      },
    }),
    db.user.count({ where }),
  ])

  return NextResponse.json({
    users,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  })
}
