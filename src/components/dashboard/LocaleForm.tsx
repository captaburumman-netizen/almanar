/**
 * LocaleForm — language preference toggle in Account Settings.
 *
 * POSTs to /api/user/locale with 'ar' or 'en'.
 * Setting this controls the language of all transactional emails the user receives.
 */
'use client'

import { useState, useTransition } from 'react'

interface LocaleFormProps {
  initialLocale: string
  locale:        string   // UI locale
}

export function LocaleForm({ initialLocale, locale }: LocaleFormProps) {
  const [preferred, setPreferred] = useState<'ar' | 'en'>(
    initialLocale === 'en' ? 'en' : 'ar',
  )
  const [status,   setStatus]   = useState<'idle' | 'success' | 'error'>('idle')
  const [message,  setMessage]  = useState('')
  const [pending,  startTransition] = useTransition()
  const isAr = locale === 'ar'

  async function save(next: 'ar' | 'en') {
    if (next === preferred) return
    setStatus('idle')
    setPreferred(next)

    startTransition(async () => {
      try {
        const res  = await fetch('/api/user/locale', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ locale: next }),
        })
        const data = await res.json() as { error?: string }
        if (!res.ok) {
          setPreferred(next === 'ar' ? 'en' : 'ar') // revert
          setStatus('error')
          setMessage(data.error ?? (isAr ? 'حدث خطأ' : 'Something went wrong'))
        } else {
          setStatus('success')
          setMessage(
            isAr
              ? 'تم تحديث لغة البريد الإلكتروني'
              : 'Email language updated',
          )
        }
      } catch {
        setPreferred(next === 'ar' ? 'en' : 'ar') // revert
        setStatus('error')
        setMessage(isAr ? 'حدث خطأ، حاول مجدداً' : 'Something went wrong, please retry')
      }
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {isAr
          ? 'اختر لغة رسائل البريد الإلكتروني التي تتلقاها منا (التسجيل، الشهادات، إلخ).'
          : 'Choose the language for emails we send you (enrollment, certificates, etc.).'}
      </p>

      {/* Toggle buttons */}
      <div
        role="radiogroup"
        aria-label={isAr ? 'لغة البريد الإلكتروني' : 'Email language'}
        className="inline-flex rounded-lg border border-border overflow-hidden"
      >
        {(['ar', 'en'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={preferred === opt}
            disabled={pending}
            onClick={() => void save(opt)}
            className={[
              'px-5 py-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
              preferred === opt
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-foreground hover:bg-muted',
            ].join(' ')}
          >
            {opt === 'ar'
              ? (isAr ? 'العربية' : 'Arabic')
              : (isAr ? 'الإنجليزية' : 'English')}
          </button>
        ))}
      </div>

      {status !== 'idle' && (
        <p
          className={`text-sm ${status === 'success' ? 'text-sage' : 'text-destructive'}`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  )
}
