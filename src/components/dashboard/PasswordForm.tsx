'use client'

import { useState, useTransition } from 'react'

interface PasswordFormProps {
  locale: string
}

export function PasswordForm({ locale }: PasswordFormProps) {
  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [status,   setStatus]   = useState<'idle' | 'success' | 'error'>('idle')
  const [message,  setMessage]  = useState('')
  const [pending, startTransition] = useTransition()
  const isAr = locale === 'ar'

  const mismatch = next.length > 0 && confirm.length > 0 && next !== confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mismatch) return
    setStatus('idle')

    startTransition(async () => {
      try {
        const res = await fetch('/api/user/password', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ currentPassword: current, newPassword: next }),
        })
        const data = await res.json() as { error?: string }
        if (!res.ok) {
          setStatus('error')
          setMessage(data.error ?? (isAr ? 'حدث خطأ' : 'Something went wrong'))
        } else {
          setStatus('success')
          setMessage(isAr ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully')
          setCurrent('')
          setNext('')
          setConfirm('')
        }
      } catch {
        setStatus('error')
        setMessage(isAr ? 'حدث خطأ، حاول مجدداً' : 'Something went wrong, please retry')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Current password */}
      <div className="space-y-1.5">
        <label htmlFor="current-pw" className="block text-sm font-medium text-foreground">
          {isAr ? 'كلمة المرور الحالية' : 'Current Password'}
        </label>
        <input
          id="current-pw"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* New password */}
      <div className="space-y-1.5">
        <label htmlFor="new-pw" className="block text-sm font-medium text-foreground">
          {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
        </label>
        <input
          id="new-pw"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          minLength={8}
          required
          autoComplete="new-password"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <p className="text-xs text-muted-foreground">
          {isAr ? '٨ أحرف على الأقل' : 'At least 8 characters'}
        </p>
      </div>

      {/* Confirm password */}
      <div className="space-y-1.5">
        <label htmlFor="confirm-pw" className="block text-sm font-medium text-foreground">
          {isAr ? 'تأكيد كلمة المرور' : 'Confirm New Password'}
        </label>
        <input
          id="confirm-pw"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          className={[
            'w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            mismatch ? 'border-destructive' : 'border-border',
          ].join(' ')}
        />
        {mismatch && (
          <p className="text-xs text-destructive" role="alert">
            {isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'}
          </p>
        )}
      </div>

      {/* Status message */}
      {status !== 'idle' && (
        <p
          className={`text-sm ${status === 'success' ? 'text-sage' : 'text-destructive'}`}
          role="status"
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || mismatch || !current || !next || !confirm}
        className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending
          ? (isAr ? 'جارٍ التغيير…' : 'Updating…')
          : (isAr ? 'تغيير كلمة المرور' : 'Change Password')}
      </button>
    </form>
  )
}
