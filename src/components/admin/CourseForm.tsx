/**
 * Course create / edit form.
 *
 * Used on both /admin/courses/new and /admin/courses/[courseId].
 * If `courseId` is provided, sends PATCH; otherwise sends POST.
 * Redirects to the course edit page after successful creation.
 */
'use client'

import { useState }        from 'react'
import { useRouter }       from 'next/navigation'
import { S3Upload }        from '@/components/admin/S3Upload'

interface CourseFormProps {
  locale:     string
  courseId?:  string
  initial?:   Partial<CourseValues>
}

interface CourseValues {
  titleEn:         string
  titleAr:         string
  descriptionEn:   string
  descriptionAr:   string
  shortDescEn:     string
  shortDescAr:     string
  price:           string
  isMemberOnly:    boolean
  level:           string
  categoryEn:      string
  categoryAr:      string
  thumbnail:       string
  previewVideoUrl: string
  slug:            string
}

const DEFAULTS: CourseValues = {
  titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '',
  shortDescEn: '', shortDescAr: '', price: '0', isMemberOnly: false,
  level: 'BEGINNER', categoryEn: '', categoryAr: '',
  thumbnail: '', previewVideoUrl: '', slug: '',
}

export function CourseForm({ locale, courseId, initial = {} }: CourseFormProps) {
  const router = useRouter()
  const [values,  setValues]  = useState<CourseValues>({ ...DEFAULTS, ...initial })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function set(key: keyof CourseValues, value: string | boolean) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const url    = courseId ? `/api/admin/courses/${courseId}` : '/api/admin/courses'
    const method = courseId ? 'PATCH' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          price: Number(values.price),
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Save failed')
        return
      }

      if (!courseId) {
        // Redirect to edit page after creation
        router.push(`/${locale}/admin/courses/${json.course.id}`)
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
        <Field label="Title (English)" required>
          <input
            type="text"
            value={values.titleEn}
            onChange={(e) => set('titleEn', e.target.value)}
            className="input-brand"
            required
          />
        </Field>
        <Field label="Title (Arabic)" required>
          <input
            dir="rtl"
            type="text"
            value={values.titleAr}
            onChange={(e) => set('titleAr', e.target.value)}
            className="input-brand"
            required
          />
        </Field>
        <Field label="Slug (auto-generated if empty)">
          <input
            type="text"
            value={values.slug}
            onChange={(e) => set('slug', e.target.value)}
            placeholder="my-course-slug"
            className="input-brand font-mono text-sm"
          />
        </Field>
      </fieldset>

      {/* Short descriptions */}
      <fieldset className="card-brand p-5 space-y-4">
        <legend className="text-sm font-semibold text-foreground px-1 -mb-2">Short Descriptions</legend>
        <Field label="Short description (English)" required>
          <input
            type="text"
            value={values.shortDescEn}
            onChange={(e) => set('shortDescEn', e.target.value)}
            className="input-brand"
            required
          />
        </Field>
        <Field label="Short description (Arabic)" required>
          <input
            dir="rtl"
            type="text"
            value={values.shortDescAr}
            onChange={(e) => set('shortDescAr', e.target.value)}
            className="input-brand"
            required
          />
        </Field>
      </fieldset>

      {/* Full descriptions */}
      <fieldset className="card-brand p-5 space-y-4">
        <legend className="text-sm font-semibold text-foreground px-1 -mb-2">Full Descriptions</legend>
        <Field label="Description (English)" required>
          <textarea
            rows={4}
            value={values.descriptionEn}
            onChange={(e) => set('descriptionEn', e.target.value)}
            className="input-brand resize-y"
            required
          />
        </Field>
        <Field label="Description (Arabic)" required>
          <textarea
            dir="rtl"
            rows={4}
            value={values.descriptionAr}
            onChange={(e) => set('descriptionAr', e.target.value)}
            className="input-brand resize-y"
            required
          />
        </Field>
      </fieldset>

      {/* Commerce */}
      <fieldset className="card-brand p-5 space-y-4">
        <legend className="text-sm font-semibold text-foreground px-1 -mb-2">Commerce</legend>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (USD)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.price}
              onChange={(e) => set('price', e.target.value)}
              className="input-brand"
            />
          </Field>
          <Field label="Level">
            <select
              value={values.level}
              onChange={(e) => set('level', e.target.value)}
              className="input-brand"
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={values.isMemberOnly}
            onChange={(e) => set('isMemberOnly', e.target.checked)}
            className="rounded border-input"
          />
          <span className="text-foreground">Members-only access</span>
        </label>
      </fieldset>

      {/* Categories */}
      <fieldset className="card-brand p-5 space-y-4">
        <legend className="text-sm font-semibold text-foreground px-1 -mb-2">Category (optional)</legend>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category (English)">
            <input
              type="text"
              value={values.categoryEn}
              onChange={(e) => set('categoryEn', e.target.value)}
              className="input-brand"
            />
          </Field>
          <Field label="Category (Arabic)">
            <input
              dir="rtl"
              type="text"
              value={values.categoryAr}
              onChange={(e) => set('categoryAr', e.target.value)}
              className="input-brand"
            />
          </Field>
        </div>
      </fieldset>

      {/* Media */}
      <fieldset className="card-brand p-5 space-y-4">
        <legend className="text-sm font-semibold text-foreground px-1 -mb-2">Media (optional)</legend>
        <Field label="Thumbnail S3 key or URL">
          <input
            type="text"
            value={values.thumbnail}
            onChange={(e) => set('thumbnail', e.target.value)}
            placeholder="thumbnails/my-course.jpg"
            className="input-brand font-mono text-sm"
          />
        </Field>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Or upload thumbnail:</p>
          <S3Upload
            keyPrefix="thumbnails/"
            accept="image/*"
            currentKey={values.thumbnail || null}
            onUploaded={(key) => set('thumbnail', key)}
            label="Upload Thumbnail"
          />
        </div>
        <Field label="Preview video URL (optional)">
          <input
            type="url"
            value={values.previewVideoUrl}
            onChange={(e) => set('previewVideoUrl', e.target.value)}
            placeholder="https://..."
            className="input-brand"
          />
        </Field>
      </fieldset>

      {/* Feedback */}
      {error   && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary px-6 py-2 rounded-md text-sm disabled:opacity-60"
        >
          {saving ? 'Saving…' : courseId ? 'Save Changes' : 'Create Course'}
        </button>
        <a
          href={`/${locale}/admin/courses`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ms-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}
