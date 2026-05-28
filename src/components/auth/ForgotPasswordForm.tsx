'use client'

/**
 * ForgotPasswordForm — requests a password-reset email.
 *
 * Always shows a success state after submission to prevent email enumeration
 * (mirrors the API's always-200 behaviour).
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function ForgotPasswordForm() {
  const t = useTranslations('auth')

  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.toLowerCase().trim() }),
      })

      // Always show success (API never reveals if email exists)
      setSent(true)
    } catch {
      setError(t('genericError'))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <Alert variant="success">
        <AlertDescription>{t('resetEmailSent')}</AlertDescription>
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
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={loading}
        />
      </div>

      <Button type="submit" className="w-full" loading={loading}>
        {t('sendResetLink')}
      </Button>
    </form>
  )
}
