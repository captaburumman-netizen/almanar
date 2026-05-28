/**
 * Lesson create / edit form.
 *
 * If `lessonId` is provided → PATCH; otherwise → POST.
 * Includes S3 direct-upload for video file.
 */
'use client'

import { useState }      from 'react'
import { useRouter }     from 'next/navigation'
import { S3Upload }      from '@/components/admin/S3Upload'

interface LessonFormProps {
  locale:    string
  courseId:  string
  lessonId?: string
  initial?:  Partial<LessonValues>
}

interface LessonValues {
  titleEn:       string
  titleAr:       string
  descriptionEn: string
  descriptionAr: string
  s3Key:         string
  duration:      string
  isPreview:     boolean
  isPublished:   boolean
  slug:          string
}

const DEFAULTS: LessonValues = {
  titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '',
  s3Key: '', duration: '', isPreview: false, isPublished: false, slug: '',
}

export function LessonForm({ locale, courseId, lessonId, initial = {} }: LessonFormProps) {
  const router = useRouter()
  const [values,  setValues]  = useState<LessonValues>({ ...DEFAULTS, ...initial })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function set(key: keyof LessonValues, value: string | boolean) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const url = lessonId
      ? `/api/admin/courses/${courseId}/lessons/${lessonId}`
      : `/api/admin/courses/${courseId}/lessons`
    const method = lessonId ? 'PATCH' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          duration: values.duration ? Number(values.duration) : null,
          s3Key:    values.s3Key || null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Save failed')
        return
      }

      if (!lessonId) {
        router.push(`/${locale}/admin/courses/${courseId}`)
      } else {
        setSuccess('Saved successfully')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Titles */}
      <fieldset className="card-brand p-5 space-y-4">
        <legend className="text-sm font-semibold text-foreground px-1 -mb-2">Titles</legend>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Title (English)<span className="text-destructive ms-0.5">*</span></span>
          <input
            type="text"
            value={values.titleEn}
            onChange={(e) => set('titleEn', e.target.value)}
            className="input-brand"
            required
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Title (Arabic)<span className="text-destructive ms-0.5">*</span></span>
          <input
            dir="rtl"
            type="text"
            value={values.titleAr}
            onChange={(e) => set('titleAr', e.target.value)}
            className="input-brand"
            required
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Slug</span>
          <input
            type="text"
            value={values.slug}
            onChange={(e) => set('slug', e.target.value)}
            placeholder="auto-generated from English title"
            className="input-brand font-mono text-sm"
          />
        </label>
      </fieldset>

      {/* Descriptions */}
      <fieldset className="card-brand p-5 space-y-4">
        <legend className="text-sm font-semibold text-foreground px-1 -mb-2">Descriptions (optional)</legend>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Description (English)</span>
          <textarea
            rows={3}
            value={values.descriptionEn}
            onChange={(e) => set('descriptionEn', e.target.value)}
            className="input-brand resize-y"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Description (Arabic)</span>
          <textarea
            dir="rtl"
            rows={3}
            value={values.descriptionAr}
            onChange={(e) => set('descriptionAr', e.target.value)}
            className="input-brand resize-y"
          />
        </label>
      </fieldset>

      {/* Video */}
      <fieldset className="card-brand p-5 space-y-4">
        <legend className="text-sm font-semibold text-foreground px-1 -mb-2">Video</legend>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">S3 key</span>
          <input
            type="text"
            value={values.s3Key}
            onChange={(e) => set('s3Key', e.target.value)}
            placeholder="lessons/my-video.mp4"
            className="input-brand font-mono text-sm"
          />
        </label>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Or upload directly:</p>
          <S3Upload
            keyPrefix="lessons/"
            accept="video/*"
            currentKey={values.s3Key || null}
            onUploaded={(key) => set('s3Key', key)}
            label="Upload Video"
          />
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Duration (seconds)</span>
          <input
            type="number"
            min="0"
            value={values.duration}
            onChange={(e) => set('duration', e.target.value)}
            placeholder="e.g. 360"
            className="input-brand w-32"
          />
        </label>
      </fieldset>

      {/* Config */}
      <fieldset className="card-brand p-5 space-y-3">
        <legend className="text-sm font-semibold text-foreground px-1 -mb-2">Settings</legend>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={values.isPreview}
            onChange={(e) => set('isPreview', e.target.checked)}
            className="rounded border-input"
          />
          <span>Free preview (visible without enrollment)</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={values.isPublished}
            onChange={(e) => set('isPublished', e.target.checked)}
            className="rounded border-input"
          />
          <span>Published</span>
        </label>
      </fieldset>

      {error   && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary px-6 py-2 rounded-md text-sm disabled:opacity-60"
        >
          {saving ? 'Saving…' : lessonId ? 'Save Changes' : 'Create Lesson'}
        </button>
        <a
          href={`/${locale}/admin/courses/${courseId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}
