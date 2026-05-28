/**
 * Pricing / Membership page — /[locale]/pricing
 *
 * Shows membership plan(s) with monthly/annual billing toggle.
 * Membership plans are fetched from the DB (created in seed).
 * Falls back to a static plan when DB is unavailable.
 */
import { getTranslations }  from 'next-intl/server'
import { getServerSession } from 'next-auth'
import { Link }             from '@/i18n/navigation'
import { db }               from '@/lib/db'
import { authOptions }      from '@/lib/auth'
import { formatPrice } from '@/lib/utils'
import type { Locale }      from '@/i18n/routing'
import { PricingToggle }    from '@/components/pricing/PricingToggle'

export const dynamic = 'force-dynamic'

interface PricingPageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: PricingPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'pricing' })
  return { title: t('title') }
}

export default async function PricingPage({ params }: PricingPageProps) {
  const { locale }  = await params
  const t           = await getTranslations({ locale, namespace: 'pricing' })
  const isAr        = locale === 'ar'

  const [plans, session] = await Promise.all([
    db.membershipPlan.findMany({
      where:   { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    }).catch(() => []),
    getServerSession(authOptions),
  ])

  const isAuthed = !!session?.user

  return (
    <div className="py-16 sm:py-24">
      <div className="container-brand max-w-4xl">
        {/* Header */}
        <div className="text-center space-y-4 mb-14">
          <h1 className="text-heading-xl font-bold text-warm-brown">{t('title')}</h1>
          <p className="text-body-lg text-brand-muted">{t('subtitle')}</p>

          {/* Billing toggle (client component) */}
          <PricingToggle locale={locale} />
        </div>

        {/* Plan cards */}
        {plans.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-1 lg:grid-cols-1 max-w-lg mx-auto">
            {plans.map((plan) => (
              <div key={plan.id} className="card-brand overflow-hidden">
                {/* Card header */}
                <div className="bg-terracotta px-8 py-8 text-center">
                  <h2 className="text-xl font-bold text-white mb-1">
                    {isAr ? plan.nameAr : plan.nameEn}
                  </h2>
                  {(isAr ? plan.descriptionAr : plan.descriptionEn) && (
                    <p className="text-white/80 text-sm">
                      {isAr ? plan.descriptionAr : plan.descriptionEn}
                    </p>
                  )}

                  {/* Price display — updated by PricingToggle via CSS data attrs */}
                  <div className="mt-6">
                    <div data-billing="monthly">
                      <p className="text-4xl font-bold text-white">
                        {formatPrice(Number(plan.monthlyPrice), locale, 'USD')}
                      </p>
                      <p className="text-white/70 text-sm mt-1">{t('perMonth')}</p>
                    </div>
                    <div data-billing="annual" className="hidden">
                      <p className="text-4xl font-bold text-white">
                        {formatPrice(Number(plan.annualPrice), locale, 'USD')}
                      </p>
                      <p className="text-white/70 text-sm mt-1">{t('perYear')}</p>
                      <p className="text-white/60 text-xs mt-0.5">{t('billedAnnually')}</p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="px-8 py-8 space-y-6">
                  <ul className="space-y-3" role="list">
                    {(isAr ? plan.featuresAr : plan.featuresEn).map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <svg className="mt-0.5 h-5 w-5 shrink-0 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA — each billing interval gets its own link; toggle shows/hides via data-billing */}
                  {isAuthed ? (
                    <>
                      <div data-billing="monthly">
                        <Link
                          href={`/api/stripe/subscribe?planId=${plan.id}&interval=monthly&locale=${locale}` as '/api/stripe/subscribe'}
                          className="block w-full rounded-lg bg-primary py-3.5 text-center font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          {t('subscribe')}
                        </Link>
                      </div>
                      <div data-billing="annual" className="hidden">
                        <Link
                          href={`/api/stripe/subscribe?planId=${plan.id}&interval=annual&locale=${locale}` as '/api/stripe/subscribe'}
                          className="block w-full rounded-lg bg-primary py-3.5 text-center font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          {t('subscribe')}
                        </Link>
                      </div>
                    </>
                  ) : (
                    <Link
                      href="/auth/signup"
                      className="block w-full rounded-lg bg-primary py-3.5 text-center font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      {isAr ? 'أنشئ حسابًا للمتابعة' : 'Create Account to Subscribe'}
                    </Link>
                  )}

                  <p className="text-center text-xs text-muted-foreground">{t('cancelAnytime')}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Fallback static plan when DB is empty */
          <div className="card-brand overflow-hidden max-w-lg mx-auto">
            <div className="bg-terracotta px-8 py-8 text-center">
              <h2 className="text-xl font-bold text-white mb-1">
                {isAr ? 'عضوية المنار' : 'ALMANAR Membership'}
              </h2>
              <p className="text-white/80 text-sm">
                {isAr ? 'وصول كامل لجميع المحتوى' : 'Full access to all content'}
              </p>
              <div className="mt-6">
                <p className="text-4xl font-bold text-white">$9.99</p>
                <p className="text-white/70 text-sm mt-1">{t('perMonth')}</p>
              </div>
            </div>
            <div className="px-8 py-8 space-y-6">
              <ul className="space-y-3" role="list">
                {[
                  isAr ? 'وصول لجميع الدورات' : 'Access to all courses',
                  isAr ? 'تنزيلات غير محدودة' : 'Unlimited downloads',
                  isAr ? 'محتوى حصري للأعضاء' : 'Member-exclusive content',
                  isAr ? 'إلغاء في أي وقت' : 'Cancel anytime',
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={isAuthed ? '/api/stripe/subscribe' : '/auth/signup'}
                className="block w-full rounded-lg bg-primary py-3.5 text-center font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {isAuthed ? t('subscribe') : (isAr ? 'أنشئ حسابًا' : 'Get Started')}
              </Link>
              <p className="text-center text-xs text-muted-foreground">{t('cancelAnytime')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
