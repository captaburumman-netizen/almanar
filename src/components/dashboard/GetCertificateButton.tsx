'use client'

import { useState, useTransition } from 'react'

interface Props {
  courseId:   string
  locale:     string
  /** If already issued, pass the certificate code so we jump straight to "View" */
  certCode?:  string
  isAr:       boolean
}

export function GetCertificateButton({ courseId, locale, certCode: initialCode, isAr }: Props) {
  const [certCode,  setCertCode]  = useState<string | null>(initialCode ?? null)
  const [errMsg,    setErrMsg]    = useState('')
  const [isPending, startTransition] = useTransition()

  if (certCode) {
    return (
      <a
        href={`/${locale}/certificates/${certCode}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto flex items-center justify-center gap-1.5 w-full rounded-lg border border-[#C4622D] bg-[#C4622D]/5 py-2 text-sm font-semibold text-[#C4622D] hover:bg-[#C4622D]/10 transition-colors"
      >
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
        {isAr ? 'عرض الشهادة' : 'View Certificate'}
      </a>
    )
  }

  function handleIssue() {
    setErrMsg('')
    startTransition(async () => {
      try {
        const res  = await fetch('/api/certificates', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ courseId }),
        })
        const json = await res.json()
        if (res.ok && json.certificate?.code) {
          setCertCode(json.certificate.code)
        } else {
          setErrMsg(json.error ?? (isAr ? 'حدث خطأ' : 'Something went wrong'))
        }
      } catch {
        setErrMsg(isAr ? 'حدث خطأ، حاول مجدداً' : 'Something went wrong, please retry')
      }
    })
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleIssue}
        disabled={isPending}
        className="mt-auto flex items-center justify-center gap-1.5 w-full rounded-lg border border-[#C4622D] bg-[#C4622D]/5 py-2 text-sm font-semibold text-[#C4622D] hover:bg-[#C4622D]/10 disabled:opacity-50 transition-colors cursor-pointer"
      >
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
        {isPending
          ? (isAr ? 'جارٍ الإصدار…' : 'Issuing…')
          : (isAr ? 'احصل على شهادتك' : 'Get Certificate')}
      </button>
      {errMsg && <p className="text-xs text-red-500 text-center">{errMsg}</p>}
    </div>
  )
}
