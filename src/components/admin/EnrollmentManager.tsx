/**
 * Lets an admin manually enroll/unenroll a user from any published course.
 *
 * Shows a dropdown of courses the user is NOT enrolled in (to add) and
 * remove buttons on current enrollments are handled in the parent page.
 */
'use client'

import { useState }  from 'react'
import { useRouter } from 'next/navigation'

interface Course {
  id:      string
  titleEn: string
  titleAr: string
}

interface EnrollmentManagerProps {
  userId:             string
  enrolledCourseIds:  string[]
  allCourses:         Course[]
}

export function EnrollmentManager({
  userId,
  enrolledCourseIds,
  allCourses,
}: EnrollmentManagerProps) {
  const router = useRouter()
  const [selected, setSelected] = useState('')
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const available = allCourses.filter((c) => !enrolledCourseIds.includes(c.id))

  async function enroll() {
    if (!selected) return
    setBusy(true)
    setError(null)

    const res = await fetch(`/api/admin/users/${userId}/enroll`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ courseId: selected }),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string }
      setError(json.error ?? 'Enroll failed')
    } else {
      setSelected('')
      router.refresh()
    }

    setBusy(false)
  }

  async function unenroll(courseId: string, courseTitle: string) {
    if (!confirm(`Remove enrollment from "${courseTitle}"?`)) return
    setBusy(true)

    await fetch(`/api/admin/users/${userId}/enroll`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ courseId }),
    })

    router.refresh()
    setBusy(false)
  }

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Grant access to a course
      </p>

      {available.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          User is enrolled in all published courses.
        </p>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="input-brand text-sm flex-1 min-w-[200px] max-w-xs"
            disabled={busy}
          >
            <option value="">Select a course…</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>{c.titleEn}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void enroll()}
            disabled={!selected || busy}
            className="btn-primary text-sm px-4 py-2 rounded-md disabled:opacity-60"
          >
            {busy ? 'Enrolling…' : 'Enroll'}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Unenroll from any enrolled course */}
      {enrolledCourseIds.length > 0 && (
        <details className="mt-1">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            Remove an enrollment…
          </summary>
          <div className="mt-2 space-y-1.5">
            {enrolledCourseIds.map((cid) => {
              const course = allCourses.find((c) => c.id === cid)
              if (!course) return null
              return (
                <div key={cid} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-foreground">{course.titleEn}</span>
                  <button
                    type="button"
                    onClick={() => void unenroll(cid, course.titleEn)}
                    disabled={busy}
                    className="text-xs text-destructive hover:underline disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        </details>
      )}
    </div>
  )
}
