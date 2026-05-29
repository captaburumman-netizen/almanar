/**
 * LessonSidebar — sticky lesson list for the learn player.
 *
 * Highlights the active lesson, shows completion checkmarks,
 * and links to each lesson via ?lesson= search param.
 * Client component (uses useRouter for active-link styling).
 */
'use client'

import Link from 'next/link'
import { motion } from 'motion/react'

interface SidebarLesson {
  id:        string
  slug:      string
  title:     string
  position:  number
  duration:  number | null
  completed: boolean
}

interface LessonSidebarProps {
  lessons:          SidebarLesson[]
  activeLessonSlug: string
  courseSlug:       string
  locale:           string
}

export function LessonSidebar({
  lessons,
  activeLessonSlug,
  courseSlug,
  locale,
}: LessonSidebarProps) {
  const activeSlug = activeLessonSlug
  const isAr       = locale === 'ar'

  const completedCount = lessons.filter((l) => l.completed).length

  return (
    <motion.div
      className="rounded-xl border border-border bg-card overflow-hidden lg:sticky lg:top-[72px]"
      initial={{ opacity: 0, x: isAr ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/40">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {isAr ? 'محتوى الدورة' : 'Course Content'}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {completedCount}/{lessons.length} {isAr ? 'مكتمل' : 'completed'}
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <motion.div
          className="h-full bg-sage"
          initial={{ width: 0 }}
          animate={{ width: `${lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={lessons.length}
          aria-label={isAr ? 'تقدم الدورة' : 'Course progress'}
        />
      </div>

      {/* Lesson list */}
      <ul
        className="divide-y divide-border max-h-[calc(100vh-220px)] overflow-y-auto"
        role="list"
      >
        {lessons.map((lesson, index) => {
          const isActive = lesson.slug === activeSlug
          const href     = `/${locale}/courses/${courseSlug}/learn?lesson=${lesson.slug}`

          return (
            <motion.li
              key={lesson.id}
              initial={{ opacity: 0, x: isAr ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04, duration: 0.3, ease: 'easeOut' }}
            >
              <Link
                href={href}
                className={[
                  'flex items-start gap-3 px-4 py-3 text-sm transition-colors cursor-pointer',
                  isActive
                    ? 'bg-primary/8 border-s-2 border-primary'
                    : 'hover:bg-muted/50',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Completion indicator */}
                <span
                  className={[
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    lesson.completed
                      ? 'bg-sage text-white'
                      : isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                  ].join(' ')}
                  aria-hidden
                >
                  {lesson.completed ? (
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    lesson.position
                  )}
                </span>

                {/* Title + duration */}
                <span className="flex-1 min-w-0">
                  <span
                    className={[
                      'block leading-snug',
                      isActive
                        ? 'font-semibold text-primary'
                        : lesson.completed
                          ? 'text-muted-foreground line-through'
                          : 'text-foreground',
                    ].join(' ')}
                  >
                    {lesson.title}
                  </span>
                  {lesson.duration && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {Math.ceil(lesson.duration / 60)} {isAr ? 'د' : 'min'}
                    </span>
                  )}
                </span>
              </Link>
            </motion.li>
          )
        })}
      </ul>
    </motion.div>
  )
}
