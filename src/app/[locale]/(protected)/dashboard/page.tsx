/**
 * Student dashboard — /[locale]/dashboard
 *
 * Three sections:
 *   1. Membership / subscription status
 *   2. My Courses — enrollments with lesson progress
 *   3. My Downloads — completed product purchases with download links
 */
import Image                  from 'next/image'
import { getServerSession }   from 'next-auth'
import { Link }               from '@/i18n/navigation'
import { authOptions }        from '@/lib/auth'
import { db }                 from '@/lib/db'
import { getField, formatDate } from '@/lib/utils'
import { buildDownloadLink }  from '@/lib/downloads'
import { GetCertificateButton } from '@/components/dashboard/GetCertificateButton'
import type { Locale }        from '@/i18n/routing'

export const dynamic = 'force-dynamic'

interface DashboardPageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: DashboardPageProps) {
  const { locale } = await params
  return { title: locale === 'ar' ? 'لوحتي — المنار' : 'My Dashboard — ALMANAR' }
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params
  const isAr       = locale === 'ar'
  const session    = await getServerSession(authOptions)
  if (!session?.user?.id) return null  // (protected) layout handles redirect
  const userId = session.user.id

  // ── Parallel data fetching ───────────────────────────────────────────────
  const [enrollments, productPurchases, subscription, certificates] = await Promise.all([
    db.enrollment.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id:          true,
        accessType:  true,
        completedAt: true,
        course: {
          select: {
            id:          true,
            slug:        true,
            titleEn:     true,
            titleAr:     true,
            thumbnail:   true,
            totalDuration: true,
            _count: { select: { lessons: { where: { isPublished: true } } } },
          },
        },
      },
    }).catch(() => []),

    db.productPurchase.findMany({
      where:   { userId, status: 'COMPLETED', productId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        product: {
          select: {
            id:       true,
            slug:     true,
            titleEn:  true,
            titleAr:  true,
            coverImage: true,
          },
        },
        downloads: {
          orderBy: { createdAt: 'desc' },
          take:    1,
          select: {
            token:         true,
            expiresAt:     true,
            downloadCount: true,
            maxDownloads:  true,
          },
        },
      },
    }).catch(() => []),

    db.subscription.findUnique({
      where:  { userId },
      select: {
        status:           true,
        interval:         true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        plan: { select: { nameEn: true, nameAr: true } },
      },
    }).catch(() => null),

    db.certificate.findMany({
      where:   { userId },
      select:  { courseId: true, code: true },
    }).catch(() => []),
  ])

  // ── Lesson progress per course ───────────────────────────────────────────
  const courseIds = enrollments.map((e) => e.course.id)
  const allProgress = courseIds.length > 0
    ? await db.lessonProgress.findMany({
        where:  { userId, lesson: { courseId: { in: courseIds } } },
        select: { lesson: { select: { courseId: true } } },
      }).catch(() => [])
    : []

  const completedByCourse = new Map<string, number>()
  for (const p of allProgress) {
    const id = p.lesson.courseId
    completedByCourse.set(id, (completedByCourse.get(id) ?? 0) + 1)
  }

  // Build certificate lookup: courseId → code
  const certByCourse = new Map(certificates.map((c) => [c.courseId, c.code]))

  const firstName = (session.user.name ?? '').split(' ')[0] || (isAr ? 'طالب' : 'Student')

  return (
    <div className="space-y-10">
      {/* ── Welcome ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isAr ? `أهلاً، ${firstName}` : `Welcome back, ${firstName}`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAr ? 'هذه لوحة تتبع تقدمك' : 'Here\'s an overview of your learning progress'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/dashboard/wishlist"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
            {isAr ? 'المحفوظات' : 'Saved'}
          </Link>
          <Link
            href="/dashboard/reviews"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            {isAr ? 'تقييماتي' : 'My Reviews'}
          </Link>
        </div>
      </div>

      {/* ── Subscription card ────────────────────────────────────────────── */}
      <SubscriptionCard
        subscription={subscription}
        locale={locale}
        isAr={isAr}
      />

      {/* ── My Courses ───────────────────────────────────────────────────── */}
      <section aria-labelledby="courses-heading">
        <div className="flex items-center justify-between mb-5">
          <h2 id="courses-heading" className="text-lg font-semibold text-foreground">
            {isAr ? 'دوراتي' : 'My Courses'}
          </h2>
          <Link
            href="/courses"
            className="text-sm text-primary hover:underline"
          >
            {isAr ? 'استعرض الدورات' : 'Browse courses'}
          </Link>
        </div>

        {enrollments.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((e) => {
              const total       = e.course._count.lessons
              const completed   = completedByCourse.get(e.course.id) ?? 0
              const pct         = total > 0 ? Math.round((completed / total) * 100) : 0
              const title       = getField(e.course, 'title', locale)
              const isComplete  = total > 0 && completed >= total
              const certCode    = certByCourse.get(e.course.id)

              return (
                <div key={e.id} className="card-brand overflow-hidden flex flex-col">
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-sand-dark/20 overflow-hidden">
                    {e.course.thumbnail ? (
                      <Image
                        src={e.course.thumbnail}
                        alt={title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sand to-sand-dark/30">
                        <svg className="h-10 w-10 text-terracotta/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1 gap-3">
                    <h3 className="font-semibold text-foreground leading-snug line-clamp-2">
                      {title}
                    </h3>

                    {/* Progress */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{isAr ? `${completed} من ${total} درس` : `${completed} / ${total} lessons`}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sage transition-all duration-500"
                          style={{ width: `${pct}%` }}
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                    </div>

                    {/* CTA */}
                    <Link
                      href={`/courses/${e.course.slug}/learn` as `/courses/${string}/learn`}
                      className="mt-auto block w-full rounded-lg bg-primary py-2 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      {completed === 0
                        ? (isAr ? 'ابدأ التعلم' : 'Start Learning')
                        : isComplete
                          ? (isAr ? 'مراجعة الدورة' : 'Review Course')
                          : (isAr ? 'متابعة' : 'Continue')}
                    </Link>

                    {/* Certificate button — only when 100% complete */}
                    {isComplete && (
                      <GetCertificateButton
                        courseId={e.course.id}
                        locale={locale}
                        certCode={certCode}
                        isAr={isAr}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon="book"
            text={isAr ? 'لم تنضم إلى أي دورة بعد' : 'You haven\'t enrolled in any courses yet'}
            linkHref="/courses"
            linkLabel={isAr ? 'استعرض الدورات' : 'Browse Courses'}
          />
        )}
      </section>

      {/* ── My Downloads ─────────────────────────────────────────────────── */}
      <section aria-labelledby="downloads-heading">
        <div className="flex items-center justify-between mb-5">
          <h2 id="downloads-heading" className="text-lg font-semibold text-foreground">
            {isAr ? 'مشترياتي' : 'My Purchases'}
          </h2>
          <Link
            href="/store"
            className="text-sm text-primary hover:underline"
          >
            {isAr ? 'استعرض المتجر' : 'Browse Store'}
          </Link>
        </div>

        {productPurchases.length > 0 ? (
          <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden" role="list">
            {productPurchases.map((pp) => {
              if (!pp.product) return null
              const productTitle = getField(pp.product, 'title', locale)
              const dl           = pp.downloads[0]
              const isExpired    = dl ? dl.expiresAt < new Date() : true
              const isExhausted  = dl ? dl.downloadCount >= dl.maxDownloads : true
              const canDownload  = dl && !isExpired && !isExhausted

              return (
                <li key={pp.id} className="flex items-center gap-4 bg-background px-4 py-4">
                  {/* Thumbnail */}
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {pp.product.coverImage ? (
                      <Image
                        src={pp.product.coverImage}
                        alt={productTitle}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Title + remaining */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{productTitle}</p>
                    {dl && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {canDownload
                          ? (isAr
                              ? `متبقٍ ${dl.maxDownloads - dl.downloadCount} تنزيل`
                              : `${dl.maxDownloads - dl.downloadCount} downloads remaining`)
                          : isExpired
                            ? (isAr ? 'انتهت صلاحية الرابط' : 'Link expired')
                            : (isAr ? 'استُنفد حد التنزيل' : 'Download limit reached')}
                      </p>
                    )}
                  </div>

                  {/* Download / product link */}
                  {canDownload && dl ? (
                    <a
                      href={buildDownloadLink(dl.token)}
                      className="shrink-0 flex items-center gap-1.5 rounded-lg bg-sage/10 px-3 py-1.5 text-xs font-semibold text-sage-dark hover:bg-sage/20 transition-colors"
                      download
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {isAr ? 'تنزيل' : 'Download'}
                    </a>
                  ) : (
                    <Link
                      href={`/store/${pp.product.slug}` as `/store/${string}`}
                      className="shrink-0 text-xs text-primary hover:underline"
                    >
                      {isAr ? 'عرض المنتج' : 'View Product'}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState
            icon="bag"
            text={isAr ? 'لا توجد مشتريات بعد' : 'No purchases yet'}
            linkHref="/store"
            linkLabel={isAr ? 'تصفح المتجر' : 'Browse Store'}
          />
        )}
      </section>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type Subscription = {
  status:            string
  interval:          string
  currentPeriodEnd:  Date
  cancelAtPeriodEnd: boolean
  plan:              { nameEn: string; nameAr: string } | null
} | null

function SubscriptionCard({
  subscription,
  locale,
  isAr,
}: {
  subscription: Subscription
  locale:       string
  isAr:         boolean
}) {
  if (!subscription) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">
            {isAr ? 'لا يوجد اشتراك نشط' : 'No active membership'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAr ? 'اشترك للوصول إلى جميع محتوى الأعضاء' : 'Subscribe to unlock all member content'}
          </p>
        </div>
        <Link
          href="/pricing"
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {isAr ? 'عرض الأسعار' : 'View Plans'}
        </Link>
      </div>
    )
  }

  const isActive   = subscription.status === 'ACTIVE' || subscription.status === 'TRIALING'
  const isPastDue  = subscription.status === 'PAST_DUE'
  const planName   = subscription.plan ? getField(subscription.plan, 'name', locale) : ''
  const renewDate  = formatDate(subscription.currentPeriodEnd, locale)
  const intervalLabel = subscription.interval === 'ANNUAL'
    ? (isAr ? 'سنوي' : 'Annual')
    : (isAr ? 'شهري' : 'Monthly')

  return (
    <div className={[
      'flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border px-5 py-4',
      isActive  ? 'border-sage/40 bg-sage/5'         : '',
      isPastDue ? 'border-destructive/40 bg-destructive/5' : '',
      !isActive && !isPastDue ? 'border-border bg-muted/40' : '',
    ].join(' ')}>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className={[
            'inline-block h-2 w-2 rounded-full',
            isActive   ? 'bg-sage'        : '',
            isPastDue  ? 'bg-destructive' : '',
            !isActive && !isPastDue ? 'bg-muted-foreground' : '',
          ].join(' ')} aria-hidden />
          <p className="text-sm font-semibold text-foreground">
            {planName || (isAr ? 'عضوية المنار' : 'ALMANAR Membership')}
            <span className="ms-2 font-normal text-muted-foreground">· {intervalLabel}</span>
          </p>
        </div>
        <p className="text-xs text-muted-foreground ps-4">
          {isActive && !subscription.cancelAtPeriodEnd
            ? (isAr ? `يتجدد ${renewDate}` : `Renews ${renewDate}`)
            : isActive && subscription.cancelAtPeriodEnd
              ? (isAr ? `ينتهي ${renewDate}` : `Ends ${renewDate}`)
              : isPastDue
                ? (isAr ? 'دفعة مستحقة — يرجى تحديث بيانات الدفع' : 'Payment due — please update your payment method')
                : (isAr ? `انتهى ${renewDate}` : `Ended ${renewDate}`)}
        </p>
      </div>
      <Link
        href={`/api/stripe/portal?locale=${locale}` as '/api/stripe/portal'}
        className="shrink-0 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        {isAr ? 'إدارة الاشتراك' : 'Manage Billing'}
      </Link>
    </div>
  )
}

function EmptyState({
  icon,
  text,
  linkHref,
  linkLabel,
}: {
  icon:      'book' | 'bag'
  text:      string
  linkHref:  string
  linkLabel: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center space-y-4 rounded-xl border border-dashed border-border">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {icon === 'book' ? (
          <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        ) : (
          <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link
        href={linkHref as '/courses' | '/store'}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {linkLabel}
      </Link>
    </div>
  )
}
