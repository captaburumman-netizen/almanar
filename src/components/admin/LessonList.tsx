/**
 * Lesson list with inline reorder (up/down arrows) and publish toggles.
 * Used on the course edit page.
 */
'use client'

import { useState }        from 'react'
import { useRouter }       from 'next/navigation'
import { PublishToggle }   from '@/components/admin/PublishToggle'
import { Link }            from '@/i18n/navigation'

interface Lesson {
  id:          string
  slug:        string
  titleEn:     string
  titleAr:     string
  position:    number
  isPreview:   boolean
  isPublished: boolean
  duration:    number | null
  s3Key:       string | null
}

interface LessonListProps {
  courseId: string
  locale:   string
  lessons:  Lesson[]
}

export function LessonList({ courseId, locale: _locale, lessons: initial }: LessonListProps) {
  const router = useRouter()
  const [lessons, setLessons] = useState<Lesson[]>(initial)
  const [saving,  setSaving]  = useState(false)

  async function move(index: number, direction: 'up' | 'down') {
    const next = [...lessons]
    const swap = direction === 'up' ? index - 1 : index + 1
    if (swap < 0 || swap >= next.length) return
    const a = next[index]!
    const b = next[swap]!
    next[index] = b
    next[swap]  = a
    setLessons(next)
    setSaving(true)
    try {
      await fetch(`/api/admin/courses/${courseId}/lessons/reorder`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orderedIds: next.map((l) => l.id) }),
      })
    } finally {
      setSaving(false)
    }
  }

  async function deleteLesson(lessonId: string) {
    if (!confirm('Delete this lesson? This cannot be undone.')) return
    await fetch(`/api/admin/courses/${courseId}/lessons/${lessonId}`, { method: 'DELETE' })
    setLessons((ls) => ls.filter((l) => l.id !== lessonId))
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {lessons.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No lessons yet.
        </p>
      )}
      {lessons.map((lesson, i) => (
        <div
          key={lesson.id}
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border text-sm"
        >
          {/* Position + reorder */}
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => move(i, 'up')}
              disabled={i === 0 || saving}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none px-1"
              aria-label="Move up"
            >
              ▲
            </button>
            <span className="text-xs text-muted-foreground text-center w-5">{i + 1}</span>
            <button
              type="button"
              onClick={() => move(i, 'down')}
              disabled={i === lessons.length - 1 || saving}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none px-1"
              aria-label="Move down"
            >
              ▼
            </button>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{lesson.titleEn}</p>
            <p className="text-xs text-muted-foreground truncate">{lesson.titleAr}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {lesson.isPreview && (
                <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">Preview</span>
              )}
              {lesson.s3Key ? (
                <span className="text-xs text-green-600">● Video uploaded</span>
              ) : (
                <span className="text-xs text-muted-foreground">○ No video</span>
              )}
              {lesson.duration && (
                <span className="text-xs text-muted-foreground">
                  {Math.floor(lesson.duration / 60)}m {lesson.duration % 60}s
                </span>
              )}
            </div>
          </div>

          {/* Publish toggle */}
          <PublishToggle
            id={lesson.id}
            published={lesson.isPublished}
            endpoint={`/api/admin/courses/${courseId}/lessons/${lesson.id}`}
          />

          {/* Edit / delete */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/admin/courses/${courseId}/lessons/${lesson.id}` as `/admin/courses/${string}/lessons/${string}`}
              className="text-primary text-xs hover:underline"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => void deleteLesson(lesson.id)}
              className="text-destructive text-xs hover:underline"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
