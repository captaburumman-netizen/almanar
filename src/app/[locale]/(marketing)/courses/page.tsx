/**
 * Course catalog — /[locale]/courses
 * Server-rendered list with level filter (URL search params).
 */
import { getTranslations }  from 'next-intl/server'
import { Link }              from '@/i18n/navigation'
import { db }                from '@/lib/db'
import { CourseCard }        from '@/components/courses/CourseCard'
import type { Locale }       from '@/i18n/routing'
import type { Level }        from '@prisma/client'

export const dynamic = 'force-dynamic'

interface CoursesPageProps {
  params:      Promise<{ locale: Locale }>
  searchParams: Promise<{ level?: string }>
}

const LEVELS: Array<{ value: Level | 'ALL'; labelEn: string; labelAr: string }> = [
  { value: 'ALL',          labelEn: 'All Levels', labelAr: 'جميع المستويات' },
  { value: 'BEGINNER',     labelEn: 'Beginner',   labelAr: 'مبتدئ'           },
  { value: 'INTERMEDIATE', labelEn: 'Intermediate',labelAr: 'متوسط'           },
  { value: 'ADVANCED',     labelEn: 'Advanced',   labelAr: 'متقدم'            },
]

export async function generateMetadata({ params }: CoursesPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'courses.catalog' })
  return { title: t('title') }
}

export default async function CoursesPage({ params, searchParams }: CoursesPageProps) {
  const { locale }  = await params
  const { level }   = await searchParams
  const t           = await getTranslations({ locale, namespace: 'courses.catalog' })
  const isAr        = locale === 'ar'

  const activeLevel = (LEVELS.find((l) => l.value === level?.toUpperCase()) ?? LEVELS[0]!).value

  const courses = await db.course.findMany({
    where: {
      isPublished: true,
      ...(activeLevel !== 'ALL' ? { level: activeLevel as Level } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, slug: true,
      titleEn: true, titleAr: true,
      shortDescEn: true, shortDescAr: true,
      price: true, isMemberOnly: true,
      thumbnail: true, level: true, totalDuration: true,
      _count: { select: { lessons: true, enrollments: true } },
    },
  }).catch(() => [])

  return (
    <div className="py-12 sm:py-16">
      <div className="container-brand">
        {/* Page header */}
        <div className="mb-10 space-y-2">
          <h1 className="text-heading-lg font-bold text-warm-brown">{t('title')}</h1>
          <p className="text-body-md text-brand-muted">{t('subtitle')}</p>
        </div>

        {/* Level filter pills */}
        <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label={isAr ? 'تصفية المستوى' : 'Filter by level'}>
          {LEVELS.map(({ value, labelEn, labelAr }) => {
            const href = value === 'ALL' ? '/courses' : `/courses?level=${value.toLowerCase()}`
            const isActive = activeLevel === value
            return (
              <Link
                key={value}
                href={href as '/courses'}
                className={[
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
                ].join(' ')}
                aria-current={isActive ? 'true' : undefined}
              >
                {isAr ? labelAr : labelEn}
              </Link>
            )
          })}
        </div>

        {/* Course grid */}
        {courses.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={{ ...course, price: course.price.toString() }}
                locale={locale}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p className="text-muted-foreground">{t('noResults')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
