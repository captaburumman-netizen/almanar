/**
 * Product create / edit form.
 *
 * If `productId` → PATCH; otherwise → POST (redirect to edit page).
 * Includes S3 upload for cover image and downloadable file.
 */
'use client'

import { useState }  from 'react'
import { useRouter } from 'next/navigation'
import { S3Upload }  from '@/components/admin/S3Upload'

interface ProductFormProps {
  locale:      string
  productId?:  string
  initial?:    Partial<ProductValues>
}

interface ProductValues {
  titleEn:       string
  titleAr:       string
  descriptionEn: string
  descriptionAr: string
  price:         string
  category:      string
  language:      string
  coverImage:    string
  s3Key:         string
  affiliateUrl:  string
  sortOrder:     string
  slug:          string
}

const DEFAULTS: ProductValues = {
  titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '',
  price: '0', category: 'EBOOK', language: 'BILINGUAL',
  coverImage: '', s3Key: '', affiliateUrl: '', sortOrder: '0', slug: '',
}

export function ProductForm({ locale, productId, initial = {} }: ProductFormProps) {
  const router = useRouter()
  const [values,  setValues]  = useState<ProductValues>({ ...DEFAULTS, ...initial })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function set(key: keyof ProductValues, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  const isAffiliate = values.category === 'TOY_AFFILIATE'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const url    = productId ? `/api/admin/products/${productId}` : '/api/admin/products'
    const method = productId ? 'PATCH' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          price:     Number(values.price),
          sortOrder: Number(values.sortOrder),
          s3Key:     isAffiliate ? null : (values.s3Key || null),
          affiliateUrl: isAffiliate ? (values.affiliateUrl || null) : null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Save failed')
        return
      }

      if (!productId) {
        router.push(`/${locale}/admin/products/${json.product.id}`)
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
          <input type="text" value={values.titleEn} onChange={(e) => set('titleEn', e.target.value)} className="input-brand" required />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Title (Arabic)<span className="text-destructive ms-0.5">*</span></span>
          <input dir="rtl" type="text" value={values.titleAr} onChange={(e) => set('titleAr', e.target.value)} className="input-brand" required />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Slug</span>
          <input type="text" value={values.slug} onChange={(e) => set('slug', e.target.value)} placeholder="auto-generated" className="input-brand font-mono text-sm" />
        </label>
      </fieldset>

      {/* Descriptions */}
      <fieldset className="card-brand p-5 space-y-4">
        <legend className="text-sm font-semibold text-foreground px-1 -mb-2">Descriptions</legend>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Description (English)<span className="text-destructive ms-0.5">*</span></span>
          <textarea rows={4} value={values.descriptionEn} onChange={(e) => set('descriptionEn', e.target.value)} className="input-brand resize-y" required />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Description (Arabic)<span className="text-destructive ms-0.5">*</span></span>
          <textarea dir="rtl" rows={4} value={values.descriptionAr} onChange={(e) => set('descriptionAr', e.target.value)} className="input-brand resize-y" required />
        </label>
      </fieldset>

      {/* Commerce */}
      <fieldset className="card-brand p-5 space-y-4">
        <legend className="text-sm font-semibold text-foreground px-1 -mb-2">Commerce</legend>
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">Price (USD)</span>
            <input type="number" min="0" step="0.01" value={values.price} onChange={(e) => set('price', e.target.value)} className="input-brand" disabled={isAffiliate} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">Sort Order</span>
            <input type="number" min="0" value={values.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} className="input-brand" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">Category</span>
            <select value={values.category} onChange={(e) => set('category', e.target.value)} className="input-brand">
              <option value="EBOOK">eBook</option>
              <option value="PRINTABLE">Printable</option>
              <option value="MONTESSORI_MATERIAL">Montessori Material</option>
              <option value="TOY_AFFILIATE">Toy Affiliate</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">Language</span>
            <select value={values.language} onChange={(e) => set('language', e.target.value)} className="input-brand">
              <option value="BILINGUAL">Bilingual</option>
              <option value="EN">English</option>
              <option value="AR">Arabic</option>
            </select>
          </label>
        </div>
      </fieldset>

      {/* Delivery */}
      <fieldset className="card-brand p-5 space-y-4">
        <legend className="text-sm font-semibold text-foreground px-1 -mb-2">
          {isAffiliate ? 'Affiliate Link' : 'File Delivery'}
        </legend>

        {isAffiliate ? (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">Affiliate URL</span>
            <input type="url" value={values.affiliateUrl} onChange={(e) => set('affiliateUrl', e.target.value)} placeholder="https://amzn.to/..." className="input-brand" />
          </label>
        ) : (
          <>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">S3 file key</span>
              <input type="text" value={values.s3Key} onChange={(e) => set('s3Key', e.target.value)} placeholder="products/my-ebook.pdf" className="input-brand font-mono text-sm" />
            </label>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Or upload file:</p>
              <S3Upload
                keyPrefix="products/"
                accept=".pdf,.epub,.zip,.docx"
                currentKey={values.s3Key || null}
                onUploaded={(key) => set('s3Key', key)}
                label="Upload File"
              />
            </div>
          </>
        )}
      </fieldset>

      {/* Cover image */}
      <fieldset className="card-brand p-5 space-y-4">
        <legend className="text-sm font-semibold text-foreground px-1 -mb-2">Cover Image (optional)</legend>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">S3 key or URL</span>
          <input type="text" value={values.coverImage} onChange={(e) => set('coverImage', e.target.value)} placeholder="covers/my-product.jpg" className="input-brand font-mono text-sm" />
        </label>
        <S3Upload
          keyPrefix="covers/"
          accept="image/*"
          currentKey={values.coverImage || null}
          onUploaded={(key) => set('coverImage', key)}
          label="Upload Cover"
        />
      </fieldset>

      {error   && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary px-6 py-2 rounded-md text-sm disabled:opacity-60">
          {saving ? 'Saving…' : productId ? 'Save Changes' : 'Create Product'}
        </button>
        <a href={`/${locale}/admin/products`} className="text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </a>
      </div>
    </form>
  )
}
