/**
 * CourseCard — Premium card design with gold hover accents.
 */
import Image    from 'next/image'
import { Link } from '@/i18n/navigation'
import { getField, formatPrice, formatDuration } from '@/lib/utils'
import type { Locale } from '@/i18n/routing'

interface CourseCardProps {
  course: {
    id: string; slug: string; titleEn: string; titleAr: string;
    shortDescEn: string; shortDescAr: string; price: string | number;
    isMemberOnly: boolean; thumbnail: string | null; level: string;
    totalDuration: number | null;
    _count?: { lessons: number; enrollments: number }
  }
  locale: Locale
}

const LEVEL_LABELS: Record<string, { en: string; ar: string; classes: string }> = {
  BEGINNER:     { en: 'Beginner',     ar: 'مبتدئ', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  INTERMEDIATE: { en: 'Intermediate', ar: 'متوسط', classes: 'bg-blue-50 text-blue-700 border-blue-200'         },
  ADVANCED:     { en: 'Advanced',     ar: 'متقدم', classes: 'bg-violet-50 text-violet-700 border-violet-200'   },
}

export function CourseCard({ course, locale }: CourseCardProps) {
  const isAr  = locale === 'ar'
  const title = getField(course, 'title', locale)
  const desc  = getField(course, 'shortDesc', locale)
  const price = Number(course.price)
  const level = LEVEL_LABELS[course.level] ?? { en: 'Beginner', ar: 'مبتدئ', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' }

  return (
    <Link
      href={`/courses/${course.slug}` as `/courses/${string}`}
      className="group block rounded-2xl border border-stone-200 bg-white overflow-hidden hover:border-gold/40 hover:shadow-gold-sm transition-all duration-200 cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-stone-100 overflow-hidden">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={title}
            fill
            className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200">
            <svg className="h-12 w-12 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-3 start-3 flex gap-1.5">
          {course.isMemberOnly && (
            <span className="rounded-full bg-stone-900/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-semibold text-gold">
              {isAr ? 'للأعضاء' : 'Member'}
            </span>
          )}
          {price === 0 && !course.isMemberOnly && (
            <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
              {isAr ? 'مجاني' : 'Free'}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        {/* Level badge */}
        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${level.classes}`}>
          {isAr ? level.ar : level.en}
        </span>

        {/* Title */}
        <h3 className="font-semibold text-stone-900 leading-snug line-clamp-2 group-hover:text-gold transition-colors duration-150">
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">{desc}</p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <div className="flex items-center gap-3 text-xs text-stone-400">
            {course._count?.lessons !== undefined && (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {course._count.lessons} {isAr ? 'درس' : 'lessons'}
              </span>
            )}
            {course.totalDuration && (
              <span>{formatDuration(course.totalDuration, locale)}</span>
            )}
          </div>
          <p className="font-bold text-sm text-stone-900">
            {course.isMemberOnly
              ? <span className="text-gold">{isAr ? 'للأعضاء' : 'Member'}</span>
              : price === 0
                ? <span className="text-emerald-600">{isAr ? 'مجاني' : 'Free'}</span>
                : formatPrice(price, locale, 'USD')}
          </p>
        </div>
      </div>
    </Link>
  )
}
