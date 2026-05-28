/**
 * Payment success — /[locale]/payment/success
 *
 * Shown after a successful Stripe Checkout for:
 *   ?type=course&courseSlug=...   → course purchase
 *   ?type=subscription            → membership subscription
 */
import { Link }        from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

interface SuccessPageProps {
  params:      Promise<{ locale: Locale }>
  searchParams: Promise<{
    type?:        string
    courseSlug?:  string
    productSlug?: string
  }>
}

export async function generateMetadata({ params }: SuccessPageProps) {
  const { locale } = await params
  return {
    title: locale === 'ar' ? 'تمّت العملية بنجاح' : 'Payment Successful',
  }
}

export default async function PaymentSuccessPage({
  params,
  searchParams,
}: SuccessPageProps) {
  const { locale }                        = await params
  const { type, courseSlug, productSlug } = await searchParams
  const isAr                              = locale === 'ar'
  const isSubscription                    = type === 'subscription'
  const isProduct                         = type === 'product'

  return (
    <div className="py-24 sm:py-32">
      <div className="container-brand max-w-lg text-center space-y-8">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sage/15">
          <svg
            className="h-10 w-10 text-sage"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-heading-lg font-bold text-warm-brown">
            {isAr ? 'تمّت العملية بنجاح!' : 'Payment Successful!'}
          </h1>
          <p className="text-body-md text-muted-foreground">
            {isSubscription
              ? (isAr
                  ? 'مرحبًا بك في عضوية المنار. يمكنك الآن الوصول إلى جميع محتوى الأعضاء.'
                  : 'Welcome to ALMANAR Membership. You now have access to all member content.')
              : isProduct
                ? (isAr
                    ? 'تمّت عملية الشراء. ستجد رابط التنزيل في لوحتك.'
                    : 'Purchase complete. Your download link is waiting in your dashboard.')
                : (isAr
                    ? 'تم تسجيلك في الدورة بنجاح. ابدأ رحلة التعلم الآن!'
                    : 'You\'re now enrolled in the course. Start learning right away!')}
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isProduct ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {isAr ? 'عرض مشترياتي' : 'View My Purchases'}
              </Link>
              {productSlug && (
                <Link
                  href={`/store/${productSlug}` as `/store/${string}`}
                  className="rounded-lg border border-border bg-background px-6 py-3 font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  {isAr ? 'العودة للمنتج' : 'Back to Product'}
                </Link>
              )}
            </>
          ) : isSubscription ? (
            <>
              <Link
                href="/courses"
                className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {isAr ? 'استعرض الدورات' : 'Browse Courses'}
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg border border-border bg-background px-6 py-3 font-semibold text-foreground hover:bg-muted transition-colors"
              >
                {isAr ? 'لوحتي' : 'My Dashboard'}
              </Link>
            </>
          ) : courseSlug ? (
            <>
              <Link
                href={`/courses/${courseSlug}/learn` as `/courses/${string}/learn`}
                className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {isAr ? 'ابدأ التعلم' : 'Start Learning'}
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg border border-border bg-background px-6 py-3 font-semibold text-foreground hover:bg-muted transition-colors"
              >
                {isAr ? 'لوحتي' : 'My Dashboard'}
              </Link>
            </>
          ) : (
            <Link
              href="/dashboard"
              className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {isAr ? 'اذهب إلى لوحتي' : 'Go to Dashboard'}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
