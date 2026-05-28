/**
 * Admin user list — /[locale]/admin/users
 *
 * Server component with search + role filter via URL search params.
 */
import { db }          from '@/lib/db'
import { Link }        from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { UserSearch }  from '@/components/admin/UserSearch'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'Users — ALMANAR Admin' }
}

interface Props {
  params:      Promise<{ locale: Locale }>
  searchParams: Promise<{ q?: string; role?: string; page?: string }>
}

const PAGE_SIZE = 25

export default async function AdminUsersPage({ params, searchParams }: Props) {
  await params
  const sp       = await searchParams
  const q        = sp.q?.trim() ?? ''
  const roleFilter = sp.role === 'ADMIN' ? 'ADMIN' : sp.role === 'STUDENT' ? 'STUDENT' : null
  const page     = Math.max(1, Number(sp.page ?? 1))
  const skip     = (page - 1) * PAGE_SIZE

  const where = {
    ...(q ? {
      OR: [
        { name:  { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
      ],
    } : {}),
    ...(roleFilter ? { role: roleFilter as 'ADMIN' | 'STUDENT' } : {}),
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take:    PAGE_SIZE,
      select: {
        id:              true,
        name:            true,
        email:           true,
        role:            true,
        createdAt:       true,
        preferredLocale: true,
        _count: {
          select: { enrollments: true },
        },
        subscription: {
          select: { status: true },
        },
      },
    }),
    db.user.count({ where }),
  ])

  const totalPages  = Math.ceil(total / PAGE_SIZE)
  const hasNext     = page < totalPages
  const hasPrev     = page > 1

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (roleFilter) params.set('role', roleFilter)
    params.set('page', String(p))
    return `?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} user{total !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>

      {/* Search + filter bar */}
      <UserSearch initialQ={q} initialRole={roleFilter ?? ''} />

      {/* Table */}
      <div className="card-brand overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Locale</th>
              <th className="px-4 py-3 font-medium">Enrollments</th>
              <th className="px-4 py-3 font-medium">Subscription</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{u.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={[
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                    u.role === 'ADMIN'
                      ? 'bg-warm-brown/10 text-warm-brown'
                      : 'bg-muted text-muted-foreground',
                  ].join(' ')}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground uppercase text-xs">
                  {u.preferredLocale}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {u._count.enrollments}
                </td>
                <td className="px-4 py-3">
                  {u.subscription ? (
                    <span className={[
                      'text-xs rounded-full px-2 py-0.5 font-medium',
                      u.subscription.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground',
                    ].join(' ')}>
                      {u.subscription.status}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {u.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${u.id}` as `/admin/users/${string}`}
                    className="text-primary text-xs hover:underline"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            {hasPrev && (
              <a href={pageUrl(page - 1)} className="text-primary hover:underline">← Previous</a>
            )}
            {hasNext && (
              <a href={pageUrl(page + 1)} className="text-primary hover:underline">Next →</a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
