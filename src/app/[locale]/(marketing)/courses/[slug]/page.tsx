/**
 * Course detail — /[locale]/courses/[slug]
 *
 * Shows: cover, title/desc, lesson preview list, pricing CTA.
 * Unauthenticated users see only preview lessons.
 */
import { notFound }          from 'next/navigation'
import { getServerSession }  from 'next-auth'
import Image                 from 'next/image'
import { Link }              from '@/i18n/navigation'
import { db }                from '@/lib/db'
import { authOptions }       from '@/lib/auth'
import { getField, formatPrice, formatDuration } from '@/lib/utils'
import { buildCourseMetadata }       from '@/lib/seo'
import { ReviewList }                from '@/components/reviews/ReviewList'
import { WishlistButton }            from '@/components/wishlist/WishlistButton'
import { CourseCheckoutButton }      from '@/components/courses/CourseCheckoutButton'
import type { Locale }               from '@/i18n/routing'

export const dynamic = 'force-dynamic'

interface CourseDetailPageProps {
  params: Promise<{ locale: Locale; slug: string }>
}

const LEVEL_LABELS: Record<string, { en: string; ar: string }> = {
  BEGINNER:     { en: 'Beginner',     ar: 'مبتدئ'  },
  INTERMEDIATE: { en: 'Intermediate', ar: 'متوسط'  },
  ADVANCED:     { en: 'Advanced',     ar: 'متقدم'  },
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://almanar.co'

export async function generateMetadata({ params }: CourseDetailPageProps) {
  const { locale, slug } = await params
  const course = await db.course.findUnique({
    where:  { slug },
    select: { titleEn: true, titleAr: true, shortDescEn: true, shortDescAr: true, thumbnail: true },
  }).catch(() => null)
  if (!course) return {}

  return buildCourseMetadata({
    titleEn:    course.titleEn,
    titleAr:    course.titleAr,
    shortDescEn: course.shortDescEn,
    shortDescAr: course.shortDescAr,
    slug,
    thumbnail:  course.thumbnail,
    locale,
  })
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { locale, slug } = await params
  const isAr             = locale === 'ar'

  const [course, session] = await Promise.all([
    db.course.findUnique({
      where:  { slug, isPublished: true },
      select: {
        id: true, slug: true,
        titleEn: true, titleAr: true,
        descriptionEn: true, descriptionAr: true,
        shortDescEn: true, shortDescAr: true,
        price: true, isMemberOnly: true,
        thumbnail: true, level: true,
        totalDuration: true, categoryEn: true, categoryAr: true,
        lessons: {
          where:   { isPreview: true },
          orderBy: { position: 'asc' },
          take:    5,
          select:  { id: true, titleEn: true, titleAr: true, duration: true, isPreview: true, position: true },
        },
        _count: { select: { lessons: true, enrollments: true } },
      },
    }).catch(() => null),
    getServerSession(authOptions),
  ])

  if (!course) notFound()

  const title     = getField(course, 'title', locale)
  const desc      = getField(course, 'description', locale)
  const shortDesc = getField(course, 'shortDesc', locale)
  const price     = Number(course.price)
  const level     = LEVEL_LABELS[course.level] ?? { en: 'Beginner', ar: 'مبتدئ' }
  const isAuthed  = !!session?.user
  const userId    = session?.user?.id ?? null

  // Review eligibility + wishlist state
  const [isEnrolled, existingReview, wishlistEntry] = userId
    ? await Promise.all([
        db.enrollment.findUnique({
          where:  { userId_courseId: { userId, courseId: course.id } },
          select: { id: true },
        }).then(Boolean).catch(() => false),
        db.review.findUnique({
          where:  { userId_courseId: { userId, courseId: course.id } },
          select: { rating: true, comment: true },
        }).catch(() => null),
        db.wishlist.findUnique({
          where:  { userId_courseId: { userId, courseId: course.id } },
          select: { id: true },
        }).catch(() => null),
      ])
    : [false, null, null]

  const isWishlisted = !!wishlistEntry

  // ── JSON-LD structured data ─────────────────────────────────────────────
  const jsonLd = {
    '@context':   'https://schema.org',
    '@type':      'Course',
    name:          title,
    description:   shortDesc || desc,
    url:           `${APP_URL}/${locale}/courses/${slug}`,
    provider: {
      '@type': 'Organization',
      name:    'ALMANAR',
      sameAs:  APP_URL,
    },
    ...(course.thumbnail ? { image: course.thumbnail } : {}),
    ...(price > 0 ? {
      offers: {
        '@type':       'Offer',
        price:          price.toFixed(2),
        priceCurrency: 'USD',
        availability:  'https://schema.org/InStock',
      },
    } : {
      offers: {
        '@type':       'Offer',
        price:         '0',
        priceCurrency: 'USD',
        availability:  'https://schema.org/InStock',
      },
    }),
    courseLevel: level.en,
    inLanguage:  locale === 'ar' ? 'ar' : 'en',
    numberOfCredits: course._count.lessons,
    hasCourseInstance: {
      '@type':           'CourseInstance',
      courseMode:        'online',
      instructor: {
        '@type': 'Organization',
        name:    'ALMANAR',
      },
    },
  }

  return (
    <>
      {/* JSON-LD structured data for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

    <div className="py-12 sm:py-16">
      <div className="container-brand">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/courses" className="hover:text-foreground transition-colors">
            {isAr ? 'الدورات' : 'Courses'}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground truncate">{title}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          {/* Left: content */}
          <div className="space-y-8 min-w-0">
            {/* Cover */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-sand-dark/20">
              {course.thumbnail ? (
                <Image src={course.thumbnail} alt={title} fill className="object-cover" priority sizes="(max-width: 1024px) 100vw, 60vw" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sand to-sage/20">
                  <svg className="h-16 w-16 text-terracotta/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
              )}
            </div>

            {/* Title + meta */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {isAr ? level.ar : level.en}
                </span>
                {course.isMemberOnly && (
                  <span className="badge-terracotta">{isAr ? 'للأعضاء' : 'Member Only'}</span>
                )}
              </div>
              <h1 className="text-heading-lg font-bold text-warm-brown">{title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>{course._count.lessons} {isAr ? 'درس' : 'lessons'}</span>
                {course.totalDuration && <span>{formatDuration(course.totalDuration, locale)}</span>}
              </div>
            </div>

            {/* Description */}
            <div className="prose prose-warm max-w-none">
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{desc}</p>
            </div>

            {/* Lesson preview list */}
            {course.lessons.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-foreground">
                  {isAr ? 'دروس تجريبية' : 'Preview Lessons'}
                </h2>
                <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden" role="list">
                  {course.lessons.map((lesson) => (
                    <li key={lesson.id} className="flex items-center gap-3 bg-background px-4 py-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-terracotta/10 text-xs font-medium text-terracotta">
                        {lesson.position}
                      </span>
                      <span className="flex-1 text-sm font-medium text-foreground line-clamp-1">
                        {getField(lesson, 'title', locale)}
                      </span>
                      {lesson.duration && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {Math.ceil(lesson.duration / 60)} {isAr ? 'د' : 'min'}
                        </span>
                      )}
                      <span className="shrink-0 rounded-full bg-sage/15 px-2 py-0.5 text-xs text-sage-dark font-medium">
                        {isAr ? 'معاينة' : 'Preview'}
                      </span>
                    </li>
                  ))}
                  {course._count.lessons > course.lessons.length && (
                    <li className="flex items-center gap-3 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </span>
                      {isAr
                        ? `+${course._count.lessons - course.lessons.length} درس إضافي — سجّل للوصول`
                        : `+${course._count.lessons - course.lessons.length} more lessons — Enroll to access`}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Right: sticky pricing card */}
          <div>
            <div className="card-brand p-6 space-y-5 lg:sticky lg:top-24">
              {/* Price + wishlist */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  {course.isMemberOnly ? (
                  <p className="text-2xl font-bold text-terracotta">{isAr ? 'حصري للأعضاء' : 'Member Only'}</p>
                ) : price === 0 ? (
                  <p className="text-2xl font-bold text-sage">{isAr ? 'مجاني' : 'Free'}</p>
                ) : (
                  <p className="text-2xl font-bold text-foreground">{formatPrice(price, locale, 'USD')}</p>
                )}
                </div>
                {isAuthed && (
                  <WishlistButton
                    courseId={course.id}
                    initialSaved={isWishlisted}
                    locale={locale}
                  />
                )}
              </div>

              {/* CTA — context-aware checkout button */}
              <CourseCheckoutButton
                courseId={course.id}
                courseSlug={slug}
                price={price}
                isMemberOnly={course.isMemberOnly}
                isEnrolled={isEnrolled as boolean}
                isAuthed={isAuthed}
                locale={locale}
              />

              {/* What's included */}
              <ul className="space-y-2 pt-2 border-t border-border" role="list">
                {[
                  isAr ? `${course._count.lessons} درس` : `${course._count.lessons} lessons`,
                  course.totalDuration ? formatDuration(course.totalDuration, locale) : null,
                  isAr ? 'وصول مدى الحياة' : 'Lifetime access',
                  isAr ? 'دعم ثنائي اللغة' : 'Bilingual support',
                ].filter(Boolean).map((item, _idx) => (
                  <li key={_idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <svg className="h-4 w-4 shrink-0 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews section */}
      <div className="container-brand pb-16">
        <div className="border-t border-border pt-12 max-w-2xl">
          <ReviewList
            courseId={course.id}
            locale={locale}
            canReview={isEnrolled as boolean}
            userReview={existingReview}
          />
        </div>
      </div>
    </div>
    </>
  )
}
