/**
 * Payment cancelled — /[locale]/payment/cancel
 *
 * Shown when a user exits Stripe Checkout without completing payment.
 */
import { Link }        from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

interface CancelPageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: CancelPageProps) {
  const { locale } = await params
  return {
    title: locale === 'ar' ? 'تم إلغاء الدفع' : 'Payment Cancelled',
  }
}

export default async function PaymentCancelPage({ params }: CancelPageProps) {
  const { locale } = await params
  const isAr       = locale === 'ar'

  return (
    <div className="py-24 sm:py-32">
      <div className="container-brand max-w-lg text-center space-y-8">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sand-dark/20">
          <svg
            className="h-10 w-10 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-heading-lg font-bold text-warm-brown">
            {isAr ? 'تم إلغاء الدفع' : 'Payment Cancelled'}
          </h1>
          <p className="text-body-md text-muted-foreground">
            {isAr
              ? 'لم تُكمل عملية الدفع. لم يتم خصم أي مبلغ من حسابك.'
              : 'You didn\'t complete the payment. No charges were made to your account.'}
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/courses"
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {isAr ? 'تصفّح الدورات' : 'Browse Courses'}
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border border-border bg-background px-6 py-3 font-semibold text-foreground hover:bg-muted transition-colors"
          >
            {isAr ? 'عرض الأسعار' : 'View Pricing'}
          </Link>
        </div>
      </div>
    </div>
  )
}
