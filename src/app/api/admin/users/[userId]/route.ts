/**
 * GET   /api/admin/users/[userId] — full user profile with enrollments + purchases
 * PATCH /api/admin/users/[userId] — update role (STUDENT ↔ ADMIN)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession }       from '@/lib/adminGuard'
import { db }                        from '@/lib/db'
import type { Role }                 from '@prisma/client'

interface Params {
  params: Promise<{ userId: string }>
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdminSession()
  if (error) return error

  const { userId } = await params

  const user = await db.user.findUnique({
    where:  { id: userId },
    select: {
      id:              true,
      name:            true,
      email:           true,
      role:            true,
      createdAt:       true,
      preferredLocale: true,
      stripeCustomerId:true,
      subscription: {
        select: {
          status:            true,
          interval:          true,
          currentPeriodEnd:  true,
          cancelAtPeriodEnd: true,
          plan: {
            select: { nameEn: true, nameAr: true },
          },
        },
      },
      enrollments: {
        orderBy: { createdAt: 'desc' },
        select: {
          id:         true,
          accessType: true,
          createdAt:  true,
          course: {
            select: { id: true, titleEn: true, titleAr: true, slug: true },
          },
        },
      },
      coursePurchases: {
        orderBy: { createdAt: 'desc' },
        select: {
          id:        true,
          amount:    true,
          currency:  true,
          status:    true,
          createdAt: true,
          course: {
            select: { titleEn: true },
          },
        },
      },
      productPurchases: {
        orderBy: { createdAt: 'desc' },
        where:   { status: 'COMPLETED' },
        select: {
          id:        true,
          amount:    true,
          isFree:    true,
          status:    true,
          createdAt: true,
          product: {
            select: { titleEn: true },
          },
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user })
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAdminSession()
  if (error) return error

  const { userId } = await params

  // Prevent self-demotion
  if (session!.user.id === userId) {
    return NextResponse.json({ error: 'Admins cannot change their own role' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({})) as { role?: Role }

  if (!body.role || !['STUDENT', 'ADMIN'].includes(body.role)) {
    return NextResponse.json({ error: 'role must be STUDENT or ADMIN' }, { status: 400 })
  }

  const user = await db.user.update({
    where:  { id: userId },
    data:   { role: body.role },
    select: { id: true, role: true },
  }).catch(() => null)

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user })
}
