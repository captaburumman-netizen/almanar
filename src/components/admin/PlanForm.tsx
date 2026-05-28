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
  plan?:  Plan
  locale: string
}

const INPUT = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200 transition-colors'
const CARD  = 'rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-4'
const LABEL = 'block text-sm font-medium text-stone-700 mb-1.5'

function arrToText(arr: string[]) { return arr.join('\n') }
function textToArr(text: string)  { return text.split('\n').map(s => s.trim()).filter(Boolean) }

export function PlanForm({ plan, locale }: PlanFormProps) {
  const router = useRouter()
  const isEdit = !!plan

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
    setValues(prev => ({ ...prev, [k]: v }))
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
      const res    = await fetch(url, {
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
    <form onSubmit={e => void submit(e)} className="space-y-5">

      {/* Names */}
      <div className={CARD}>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Name</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Name (English)</label>
            <input type="text" value={values.nameEn} onChange={e => set('nameEn', e.target.value)}
              className={INPUT} placeholder="e.g. Pro Plan" required />
          </div>
          <div>
            <label className={LABEL}>الاسم (عربي)</label>
            <input dir="rtl" type="text" value={values.nameAr} onChange={e => set('nameAr', e.target.value)}
              className={INPUT} placeholder="مثال: الخطة المتقدمة" required />
          </div>
        </div>
      </div>

      {/* Descriptions */}
      <div className={CARD}>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Description (optional)</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Description (English)</label>
            <textarea rows={2} value={values.descriptionEn} onChange={e => set('descriptionEn', e.target.value)}
              className={`${INPUT} resize-none`} placeholder="Short description…" />
          </div>
          <div>
            <label className={LABEL}>الوصف (عربي)</label>
            <textarea dir="rtl" rows={2} value={values.descriptionAr} onChange={e => set('descriptionAr', e.target.value)}
              className={`${INPUT} resize-none`} placeholder="وصف مختصر…" />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className={CARD}>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Features</h2>
          <p className="text-xs text-stone-400 mt-0.5">One feature per line</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Features (English)</label>
            <textarea rows={5} value={values.featuresEnText} onChange={e => set('featuresEnText', e.target.value)}
              placeholder={"Access to all courses\nUnlimited downloads\nCancel anytime"}
              className={`${INPUT} resize-none font-mono text-xs`} />
          </div>
          <div>
            <label className={LABEL}>المميزات (عربي)</label>
            <textarea dir="rtl" rows={5} value={values.featuresArText} onChange={e => set('featuresArText', e.target.value)}
              placeholder={"وصول لجميع الدورات\nتنزيلات غير محدودة\nإلغاء في أي وقت"}
              className={`${INPUT} resize-none font-mono text-xs`} />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className={CARD}>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Pricing (USD)</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Monthly Price ($)</label>
            <input type="number" min="0" step="0.01" value={values.monthlyPrice}
              onChange={e => set('monthlyPrice', e.target.value)}
              className={INPUT} placeholder="9.99" required />
          </div>
          <div>
            <label className={LABEL}>Annual Price ($)</label>
            <input type="number" min="0" step="0.01" value={values.annualPrice}
              onChange={e => set('annualPrice', e.target.value)}
              className={INPUT} placeholder="99.99" required />
          </div>
        </div>
      </div>

      {/* Stripe IDs */}
      <div className={CARD}>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Stripe Price IDs</h2>
          <p className="text-xs text-stone-400 mt-0.5">Copy from your Stripe dashboard — starts with <code className="bg-stone-100 px-1 rounded">price_</code></p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Monthly Price ID</label>
            <input type="text" value={values.stripePriceIdMonthly}
              onChange={e => set('stripePriceIdMonthly', e.target.value)}
              placeholder="price_..." className={`${INPUT} font-mono text-xs`} required />
          </div>
          <div>
            <label className={LABEL}>Annual Price ID</label>
            <input type="text" value={values.stripePriceIdAnnual}
              onChange={e => set('stripePriceIdAnnual', e.target.value)}
              placeholder="price_..." className={`${INPUT} font-mono text-xs`} required />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-stone-900 px-8 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60 transition-colors cursor-pointer"
      >
        {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Plan'}
      </button>
    </form>
  )
}
