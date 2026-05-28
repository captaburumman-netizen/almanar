/**
 * ClaimButton — claims a free product via the /api/products/claim endpoint.
 *
 * Shows a download link inline after a successful claim.
 * Client component.
 */
'use client'

import { useState, useTransition } from 'react'

interface ClaimButtonProps {
  productId: string
  locale:    string
  /** Translation strings passed from the server page */
  labels: {
    claim:       string   // "احصل عليه مجانًا" / "Claim for Free"
    downloading: string   // "جارٍ الإعداد…"    / "Preparing…"
    download:    string   // "تنزيل الملف"       / "Download File"
    claimed:     string   // "تم الحصول عليه"   / "Already Claimed"
    error:       string   // "حدث خطأ"          / "Something went wrong"
  }
}

export function ClaimButton({ productId, locale: _locale, labels }: ClaimButtonProps) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [pending, startTransition]    = useTransition()

  async function handleClaim() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/products/claim', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ productId }),
        })
        const data = await res.json() as { downloadUrl?: string; error?: string }
        if (!res.ok || !data.downloadUrl) {
          setError(data.error ?? labels.error)
          return
        }
        setDownloadUrl(data.downloadUrl)
      } catch {
        setError(labels.error)
      }
    })
  }

  // Success state — show download link
  if (downloadUrl) {
    return (
      <a
        href={downloadUrl}
        className="flex items-center justify-center gap-2 w-full rounded-lg bg-sage py-3 text-center font-semibold text-white hover:bg-sage/90 transition-colors"
        download
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {labels.download}
      </a>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClaim}
        disabled={pending}
        className={[
          'block w-full rounded-lg bg-sage py-3 text-center font-semibold text-white',
          'hover:bg-sage/90 transition-colors cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2',
          pending ? 'opacity-60 cursor-not-allowed' : '',
        ].join(' ')}
      >
        {pending ? labels.downloading : labels.claim}
      </button>

      {error && (
        <p className="text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
