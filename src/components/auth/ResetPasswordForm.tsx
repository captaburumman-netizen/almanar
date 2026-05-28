'use client'

/**
 * ResetPasswordForm — sets a new password using the email token.
 *
 * Reads `?token=` from the URL, sends it with the new password to
 * POST /api/auth/reset-password, then redirects to sign-in on success.
 */
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ResetPasswordFormProps {
  locale: string
}

export function ResetPasswordForm({ locale }: ResetPasswordFormProps) {
  const t            = useTranslations('auth')
  const router       = useRouter()
  const searchParams = useSearchParams()

  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError(t('invalidResetLink'))
      return
    }

    if (password !== confirm) {
      setError(t('passwordMismatch'))
      return
    }

    if (password.length < 8) {
      setError(t('passwordTooShort'))
      return
    }

    setLoading(true)

    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password, confirm }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? t('genericError'))
        setLoading(false)
        return
      }

      setSuccess(true)

      // Redirect to sign-in after a brief delay
      setTimeout(() => {
        router.push(`/${locale}/auth/signin`)
      }, 2000)
    } catch {
      setError(t('genericError'))
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t('invalidResetLink')}</AlertDescription>
      </Alert>
    )
  }

  if (success) {
    return (
      <Alert variant="success">
        <AlertDescription>{t('passwordResetSuccess')}</AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="password">{t('newPassword')}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">{t('confirmPassword')}</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      <Button type="submit" className="w-full" loading={loading}>
        {t('resetPassword')}
      </Button>
    </form>
  )
}
