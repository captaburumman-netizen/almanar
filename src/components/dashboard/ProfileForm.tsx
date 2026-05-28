'use client'

import { useState, useTransition } from 'react'

interface ProfileFormProps {
  initialName: string
  locale:      string
}

export function ProfileForm({ initialName, locale }: ProfileFormProps) {
  const [name,    setName]    = useState(initialName)
  const [status,  setStatus]  = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const isAr = locale === 'ar'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('idle')

    startTransition(async () => {
      try {
        const res = await fetch('/api/user/profile', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name: name.trim() }),
        })
        const data = await res.json() as { error?: string }
        if (!res.ok) {
          setStatus('error')
          setMessage(data.error ?? (isAr ? 'حدث خطأ' : 'Something went wrong'))
        } else {
          setStatus('success')
          setMessage(isAr ? 'تم تحديث الاسم بنجاح' : 'Name updated successfully')
        }
      } catch {
        setStatus('error')
        setMessage(isAr ? 'حدث خطأ، حاول مجدداً' : 'Something went wrong, please retry')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="display-name" className="block text-sm font-medium text-foreground">
          {isAr ? 'الاسم الكامل' : 'Display Name'}
        </label>
        <input
          id="display-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={60}
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

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
        disabled={pending || name.trim().length < 2}
        className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending
          ? (isAr ? 'جارٍ الحفظ…' : 'Saving…')
          : (isAr ? 'حفظ التغييرات' : 'Save Changes')}
      </button>
    </form>
  )
}
