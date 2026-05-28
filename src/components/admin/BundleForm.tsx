/**
 * BundleForm — create or edit a bundle.
 * POST on create (redirects to edit page), PATCH on edit.
 */
'use client'

import { useState }  from 'react'
import { useRouter } from 'next/navigation'
import { S3Upload }  from '@/components/admin/S3Upload'

interface Bundle {
  id:            string
  titleEn:       string
  titleAr:       string
  descriptionEn: string
  descriptionAr: string
  price:         string | number
  coverImage:    string | null
  isPublished:   boolean
}

interface BundleFormProps {
  bundle?: Bundle   // undefined = create mode
  locale:  string
}

export function BundleForm({ bundle, locale }: BundleFormProps) {
  const router  = useRouter()
  const isEdit  = !!bundle
  const isAr    = locale === 'ar'

  const [values, setValues] = useState({
    titleEn:       bundle?.titleEn       ?? '',
    titleAr:       bundle?.titleAr       ?? '',
    descriptionEn: bundle?.descriptionEn ?? '',
    descriptionAr: bundle?.descriptionAr ?? '',
    price:         bundle?.price ? String(bundle.price) : '0',
    coverImage:    bundle?.coverImage ?? '',
  })
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(k: keyof typeof values, v: string) {
    setValues((prev) => ({ ...prev, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const payload = {
      titleEn:       values.titleEn,
      titleAr:       values.titleAr,
      descriptionEn: values.descriptionEn,
      descriptionAr: values.descriptionAr,
      price:         Number(values.price),
      coverImage:    values.coverImage || null,
    }

    const url    = isEdit ? `/api/admin/bundles/${bundle!.id}` : '/api/admin/bundles'
    const method = isEdit ? 'PATCH' : 'POST'

    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({})) as { bundle?: { id: string }; error?: string }

    if (!res.ok) {
      setError(json.error ?? 'Save failed')
      setBusy(false)
      return
    }

    if (!isEdit && json.bundle?.id) {
      router.push(`/${locale}/admin/bundles/${json.bundle.id}`)
    } else {
      router.refresh()
    }
    setBusy(false)
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-8">

      {/* ── Titles ─────────────────────────────────────────────────────── */}
      <section className="card-brand p-6 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isAr ? 'العناوين' : 'Titles'}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Title (English)</span>
            <input
              value={values.titleEn}
              onChange={(e) => set('titleEn', e.target.value)}
              className="input-brand w-full"
              placeholder="Parenting Essentials Bundle"
              required
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">العنوان (العربية)</span>
            <input
              dir="rtl"
              value={values.titleAr}
              onChange={(e) => set('titleAr', e.target.value)}
              className="input-brand w-full"
              placeholder="باقة أساسيات التربية"
              required
            />
          </label>
        </div>
      </section>

      {/* ── Descriptions ───────────────────────────────────────────────── */}
      <section className="card-brand p-6 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isAr ? 'الوصف' : 'Description'}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Description (English)</span>
            <textarea
              value={values.descriptionEn}
              onChange={(e) => set('descriptionEn', e.target.value)}
              className="input-brand w-full min-h-[100px] resize-y"
              placeholder="Everything a new parent needs…"
              required
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">الوصف (العربية)</span>
            <textarea
              dir="rtl"
              value={values.descriptionAr}
              onChange={(e) => set('descriptionAr', e.target.value)}
              className="input-brand w-full min-h-[100px] resize-y"
              placeholder="كل ما يحتاجه الوالد الجديد…"
              required
            />
          </label>
        </div>
      </section>

      {/* ── Commerce ───────────────────────────────────────────────────── */}
      <section className="card-brand p-6 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isAr ? 'التسعير' : 'Pricing'}
        </h2>
        <label className="space-y-1.5 block max-w-xs">
          <span className="text-xs font-medium text-muted-foreground">
            {isAr ? 'السعر (USD)' : 'Price (USD)'}
          </span>
          <div className="relative">
            <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.price}
              onChange={(e) => set('price', e.target.value)}
              className="input-brand w-full ps-7"
              required
            />
          </div>
        </label>
      </section>

      {/* ── Cover image ────────────────────────────────────────────────── */}
      <section className="card-brand p-6 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isAr ? 'صورة الغلاف' : 'Cover Image'}
        </h2>
        <S3Upload
          label={isAr ? 'رفع الغلاف' : 'Upload Cover'}
          accept="image/*"
          keyPrefix="covers/"
          currentKey={values.coverImage}
          onUploaded={(url) => set('coverImage', url)}
        />
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="btn-primary px-8 py-2.5 rounded-lg font-semibold disabled:opacity-60"
      >
        {busy
          ? (isAr ? 'جارٍ الحفظ…' : 'Saving…')
          : isEdit
            ? (isAr ? 'حفظ التغييرات' : 'Save Changes')
            : (isAr ? 'إنشاء الباقة' : 'Create Bundle')}
      </button>
    </form>
  )
}
