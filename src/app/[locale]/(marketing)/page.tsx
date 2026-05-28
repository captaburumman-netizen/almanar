/**
 * Homepage — ALMANAR Premium redesign.
 * Sections: Hero → Stats → Features → Courses → Store → CTA
 * Server-rendered with graceful empty states.
 */
import { getTranslations } from 'next-intl/server'
import { Link }             from '@/i18n/navigation'
import { db }               from '@/lib/db'
import { CourseCard }       from '@/components/courses/CourseCard'
import { ProductCard }      from '@/components/store/ProductCard'
import type { Locale }      from '@/i18n/routing'

export const dynamic = 'force-dynamic'

interface HomePageProps {
  params: Promise<{ locale: Locale }>
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params
  const t          = await getTranslations({ locale, namespace: 'home' })
  const tc         = await getTranslations({ locale, namespace: 'common' })
  const isAr       = locale === 'ar'

  const [courses, products] = await Promise.all([
    db.course.findMany({
      where: { isPublished: true }, take: 3, orderBy: { createdAt: 'desc' },
      select: {
        id: true, slug: true, titleEn: true, titleAr: true,
        shortDescEn: true, shortDescAr: true, price: true,
        isMemberOnly: true, thumbnail: true, level: true, totalDuration: true,
        _count: { select: { lessons: true, enrollments: true } },
      },
    }).catch(() => []),
    db.product.findMany({
      where: { isPublished: true }, take: 3, orderBy: { createdAt: 'desc' },
      select: {
        id: true, slug: true, titleEn: true, titleAr: true,
        price: true, isFree: true, category: true, language: true,
        coverImage: true, affiliateUrl: true,
      },
    }).catch(() => []),
  ])

  return (
    <>
      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative overflow-hidden bg-stone-50">
        {/* Subtle radial gold glow at top center */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-[500px]"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(202,138,4,0.08) 0%, transparent 70%)' }}
        />

        {/* Grid pattern overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(28,25,23,1) 1px, transparent 1px), linear-gradient(90deg, rgba(28,25,23,1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <div className="container-brand relative py-24 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-4xl text-center space-y-8">

            {/* Eyebrow badge */}
            <div className="flex justify-center">
              <span className="badge-gold">
                <span className="me-1.5 h-1.5 w-1.5 rounded-full bg-gold inline-block" aria-hidden />
                {t('hero.badge')}
              </span>
            </div>

            {/* Main headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-stone-900 leading-[1.05] tracking-tight">
              {t('hero.title')}
            </h1>

            {/* Gold accent underline under key phrase */}
            <div className="flex justify-center -mt-4">
              <div className="gold-line w-24" />
            </div>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-stone-500 max-w-2xl mx-auto leading-relaxed">
              {t('hero.subtitle')}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/courses"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-7 py-3.5 text-sm font-semibold text-white hover:bg-stone-800 transition-colors shadow-brand-sm cursor-pointer"
              >
                {t('hero.cta')}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-xl border-2 border-stone-200 bg-white px-7 py-3.5 text-sm font-semibold text-stone-700 hover:border-stone-300 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                {t('hero.ctaSecondary')}
              </Link>
            </div>

            {/* Trust line */}
            <p className="text-sm text-stone-400">
              {isAr
                ? '✓ بدون بطاقة ائتمانية · ✓ إلغاء في أي وقت'
                : '✓ No credit card required · ✓ Cancel anytime'}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════ STATS ═══════════════════ */}
      <section className="border-y border-stone-200 bg-white py-12">
        <div className="container-brand">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {[
              { value: '10K+', label: isAr ? 'أب وأم' : 'Parents' },
              { value: '50+',  label: isAr ? 'دورة تدريبية' : 'Courses' },
              { value: '200+', label: isAr ? 'مورد تعليمي' : 'Resources' },
              { value: '4.9★', label: isAr ? 'تقييم المستخدمين' : 'User Rating' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center space-y-1">
                <p className="text-3xl font-bold text-stone-900">{value}</p>
                <p className="text-sm text-stone-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ FEATURES ═══════════════════ */}
      <section className="py-24 bg-stone-50">
        <div className="container-brand">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold text-stone-900">{t('features.title')}</h2>
            <p className="text-lg text-stone-500 max-w-xl mx-auto">{t('features.subtitle')}</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1: Courses */}
            <div className="group relative rounded-2xl bg-white border border-stone-200 p-8 space-y-5 hover:border-gold/50 hover:shadow-gold-sm transition-all duration-200 cursor-default">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-900">
                <svg className="h-6 w-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-stone-900">{t('features.courses.title')}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{t('features.courses.desc')}</p>
              </div>
              {/* Gold hover accent */}
              <div className="absolute bottom-0 start-8 end-8 h-0.5 rounded-full bg-gradient-to-r from-gold to-gold/30 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-start" aria-hidden />
            </div>

            {/* Feature 2: Store */}
            <div className="group relative rounded-2xl bg-white border border-stone-200 p-8 space-y-5 hover:border-gold/50 hover:shadow-gold-sm transition-all duration-200 cursor-default">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-900">
                <svg className="h-6 w-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-stone-900">{t('features.store.title')}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{t('features.store.desc')}</p>
              </div>
              <div className="absolute bottom-0 start-8 end-8 h-0.5 rounded-full bg-gradient-to-r from-gold to-gold/30 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-start" aria-hidden />
            </div>

            {/* Feature 3: Membership */}
            <div className="group relative rounded-2xl bg-stone-900 border border-stone-800 p-8 space-y-5 sm:col-span-2 lg:col-span-1 hover:border-gold/60 transition-all duration-200 cursor-default">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10 border border-gold/20">
                <svg className="h-6 w-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">{t('features.membership.title')}</h3>
                <p className="text-sm text-stone-400 leading-relaxed">{t('features.membership.desc')}</p>
              </div>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gold hover:text-gold/80 transition-colors"
              >
                {isAr ? 'اكتشف العضوية' : 'Explore membership'}
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ COURSES TEASER ═══════════════════ */}
      {courses.length > 0 && (
        <section className="py-24 bg-white">
          <div className="container-brand">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
              <div className="space-y-2">
                <span className="badge-gold">{isAr ? 'الدورات' : 'Courses'}</span>
                <h2 className="text-4xl font-bold text-stone-900">{t('coursesTeaser.title')}</h2>
              </div>
              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-700 hover:text-gold transition-colors"
              >
                {t('coursesTeaser.viewAll')}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={{ ...course, price: course.price.toString() }}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════ STORE TEASER ═══════════════════ */}
      {products.length > 0 && (
        <section className="py-24 bg-stone-50">
          <div className="container-brand">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
              <div className="space-y-2">
                <span className="badge-gold">{isAr ? 'المتجر' : 'Store'}</span>
                <h2 className="text-4xl font-bold text-stone-900">{t('storeTeaser.title')}</h2>
              </div>
              <Link
                href="/store"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-700 hover:text-gold transition-colors"
              >
                {t('storeTeaser.viewAll')}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{ ...product, price: product.price.toString() }}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════ MEMBERSHIP CTA ═══════════════════ */}
      <section className="relative overflow-hidden bg-stone-900 py-24">
        {/* Subtle radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(202,138,4,0.12) 0%, transparent 70%)' }}
        />
        {/* Top gold line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" aria-hidden />

        <div className="container-brand relative text-center space-y-8">
          {/* Gold badge */}
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold inline-block" aria-hidden />
              {isAr ? 'عضوية المنار' : 'ALMANAR Membership'}
            </span>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              {isAr ? 'انضم إلى مجتمع المنار' : 'Join the ALMANAR Community'}
            </h2>
            <p className="text-lg text-stone-400 max-w-lg mx-auto leading-relaxed">
              {isAr
                ? 'وصول غير محدود لجميع الدورات والموارد بخطة عضوية واحدة بسيطة.'
                : 'Unlimited access to all courses and resources with one simple membership plan.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-8 py-3.5 text-sm font-semibold text-stone-900 hover:bg-gold/90 transition-colors shadow-gold-sm cursor-pointer"
            >
              {tc('actions.subscribe')}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center justify-center rounded-xl border border-stone-700 bg-transparent px-8 py-3.5 text-sm font-semibold text-stone-300 hover:border-stone-600 hover:text-white transition-colors cursor-pointer"
            >
              {isAr ? 'استعرض الدورات' : 'Browse Courses'}
            </Link>
          </div>

          {/* Trust indicators */}
          <p className="text-sm text-stone-500">
            {isAr ? '✓ بدون بطاقة · ✓ إلغاء في أي وقت · ✓ ضمان الاسترداد 14 يوم'
                   : '✓ No credit card · ✓ Cancel anytime · ✓ 14-day money back'}
          </p>
        </div>
      </section>
    </>
  )
}
