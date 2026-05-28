/**
 * Admin broadcast email — /[locale]/admin/broadcast
 *
 * Compose and send a batch email to a segmented audience.
 */
import { db }              from '@/lib/db'
import { BroadcastForm }   from '@/components/admin/BroadcastForm'

export async function generateMetadata() {
  return { title: 'Broadcast Email — Admin' }
}

export default async function AdminBroadcastPage() {
  // Quick stats shown at the top for context
  const [totalUsers, activeSubscribers, enrollees, purchasers] = await Promise.all([
    db.user.count().catch(() => 0),
    db.user.count({ where: { subscription: { status: 'ACTIVE' } } }).catch(() => 0),
    db.user.count({ where: { enrollments: { some: {} } } }).catch(() => 0),
    db.user.count({ where: { productPurchases: { some: { status: 'COMPLETED' } } } }).catch(() => 0),
  ])

  const audienceStats = [
    { label: 'All Users',          count: totalUsers         },
    { label: 'Active Subscribers', count: activeSubscribers  },
    { label: 'Course Students',    count: enrollees          },
    { label: 'Product Purchasers', count: purchasers         },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Broadcast Email</h1>
        <p className="mt-1 text-sm text-gray-500">
          Send a message to a segment of your users. Emails are sent in batches of 100.
        </p>
      </div>

      {/* Audience stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {audienceStats.map(({ label, count }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xl font-bold text-gray-900">{count.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{label}</p>
          </div>
        ))}
      </div>

      {/* Compose form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Compose</h2>
        <BroadcastForm />
      </div>

      {/* Safety note */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
        <strong>Note:</strong> Broadcasts are limited to 1,000 recipients per send.
        Emails are delivered asynchronously via Resend. Results are shown immediately
        but delivery may take a few minutes.
      </div>
    </div>
  )
}
