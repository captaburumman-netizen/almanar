/**
 * PlanForm — create or edit a MembershipPlan.
 *
 * Features are stored as string[] in DB.
 * In the form they're edited as newline-separated text areas.
 */
'use client'

import { useState }  from 'react'
import { useRouter } from 'next/navigation'

interface Plan {
  id:                   string
  nameEn:               string
  nameAr:               string
  descriptionEn:        string | null
  descriptionAr:        string | null
  featuresEn:           string[]
  featuresAr:           string[]
  monthlyPrice:         string | number
  annualPrice:          string | number
  stripePriceIdMonthly: string
  stripePriceIdAnnual:  string
  isActive:             boolean
}

interface PlanFormProps {
  plan?:   Plan
  locale:  string
}

function arrToText(arr: string[]) {
  return arr.join('\n')
}
function textToArr(text: string): string[] {
  return text.split('\n').map((s) => s.trim()).filter(Boolean)
}

export function PlanForm({ plan, locale }: PlanFormProps) {
  const router = useRouter()
  const isEdit = !!plan
  const isAr   = locale === 'ar'

  const [values, setValues] = useState({
    nameEn:               plan?.nameEn               ?? '',
    nameAr:               plan?.nameAr               ?? '',
    descriptionEn:        plan?.descriptionEn        ?? '',
    descriptionAr:        plan?.descriptionAr        ?? '',
    featuresEnText:       arrToText(plan?.featuresEn ?? []),
    featuresArText:       arrToText(plan?.featuresAr ?? []),
    monthlyPrice:         plan?.monthlyPrice ? String(plan.monthlyPrice) : '',
    annualPrice:          plan?.annualPrice  ? String(plan.annualPrice)  : '',
    stripePriceIdMonthly: plan?.stripePriceIdMonthly ?? '',
    stripePriceIdAnnual:  plan?.stripePriceIdAnnual  ?? '',
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
      nameEn:               values.nameEn.trim(),
      nameAr:               values.nameAr.trim(),
      descriptionEn:        values.descriptionEn.trim() || null,
      descriptionAr:        values.descriptionAr.trim() || null,
      featuresEn:           textToArr(values.featuresEnText),
      featuresAr:           textToArr(values.featuresArText),
      monthlyPrice:         values.monthlyPrice,
      annualPrice:          values.annualPrice,
      stripePriceIdMonthly: values.stripePriceIdMonthly.trim(),
      stripePriceIdAnnual:  values.stripePriceIdAnnual.trim(),
    }

    try {
      const url    = isEdit ? `/api/admin/plans/${plan!.id}` : '/api/admin/plans'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(json.error ?? `HTTP ${res.status}`)
      }

      if (!isEdit) {
        const json = await res.json() as { plan: { id: string } }
        router.push(`/${locale}/admin/plans/${json.plan.id}`)
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-6">

      {/* ── Names ────────────────────────────────────────────────────────── */}
      <section className="card-brand p-6 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isAr ? 'الاسم' : 'Name'}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Name (EN)</span>
            <input
              type="text"
              value={values.nameEn}
              onChange={(e) => set('nameEn', e.target.value)}
              className="input-brand w-full"
              required
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">الاسم (AR)</span>
            <input
              dir="rtl"
              type="text"
              value={values.nameAr}
              onChange={(e) => set('nameAr', e.target.value)}
              className="input-brand w-full"
              required
            />
          </label>
        </div>
      </section>

      {/* ── Descriptions ─────────────────────────────────────────────────── */}
      <section className="card-brand p-6 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isAr ? 'الوصف' : 'Description'}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Description (EN)</span>
            <textarea
              rows={2}
              value={values.descriptionEn}
              onChange={(e) => set('descriptionEn', e.target.value)}
              className="input-brand w-full resize-none"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">الوصف (AR)</span>
            <textarea
              dir="rtl"
              rows={2}
              value={values.descriptionAr}
              onChange={(e) => set('descriptionAr', e.target.value)}
              className="input-brand w-full resize-none"
            />
          </label>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="card-brand p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {isAr ? 'المميزات' : 'Features'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAr ? 'ميزة واحدة في كل سطر' : 'One feature per line'}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Features (EN)</span>
            <textarea
              rows={5}
              value={values.featuresEnText}
              onChange={(e) => set('featuresEnText', e.target.value)}
              placeholder={'Access to all courses\nUnlimited downloads\nCancel anytime'}
              className="input-brand w-full resize-none font-mono text-xs"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">المميزات (AR)</span>
            <textarea
              dir="rtl"
              rows={5}
              value={values.featuresArText}
              onChange={(e) => set('featuresArText', e.target.value)}
              placeholder={'وصول لجميع الدورات\nتنزيلات غير محدودة\nإلغاء في أي وقت'}
              className="input-brand w-full resize-none font-mono text-xs"
            />
          </label>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section className="card-brand p-6 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isAr ? 'الأسعار (USD)' : 'Pricing (USD)'}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              {isAr ? 'السعر الشهري' : 'Monthly Price'}
            </span>
            <div className="relative">
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={values.monthlyPrice}
                onChange={(e) => set('monthlyPrice', e.target.value)}
                className="input-brand w-full ps-7"
                required
              />
            </div>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              {isAr ? 'السعر السنوي' : 'Annual Price'}
            </span>
            <div className="relative">
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={values.annualPrice}
                onChange={(e) => set('annualPrice', e.target.value)}
                className="input-brand w-full ps-7"
                required
              />
            </div>
          </label>
        </div>
      </section>

      {/* ── Stripe Price IDs ─────────────────────────────────────────────── */}
      <section className="card-brand p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Stripe Price IDs
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAr
              ? 'انسخ معرّف السعر من لوحة Stripe (يبدأ بـ price_)'
              : 'Copy the Price ID from your Stripe dashboard (starts with price_)'}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              {isAr ? 'معرّف السعر الشهري' : 'Monthly Price ID'}
            </span>
            <input
              type="text"
              value={values.stripePriceIdMonthly}
              onChange={(e) => set('stripePriceIdMonthly', e.target.value)}
              placeholder="price_..."
              className="input-brand w-full font-mono text-xs"
              required
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              {isAr ? 'معرّف السعر السنوي' : 'Annual Price ID'}
            </span>
            <input
              type="text"
              value={values.stripePriceIdAnnual}
              onChange={(e) => set('stripePriceIdAnnual', e.target.value)}
              placeholder="price_..."
              className="input-brand w-full font-mono text-xs"
              required
            />
          </label>
        </div>
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
            : (isAr ? 'إنشاء الخطة' : 'Create Plan')}
      </button>
    </form>
  )
}
