'use client'

/**
 * SignInForm — credentials sign-in using NextAuth.
 *
 * Calls signIn('credentials', ...) with email + password.
 * On error shows an inline alert; on success NextAuth handles the redirect.
 */
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SignInFormProps {
  locale: string
}

export function SignInForm({ locale }: SignInFormProps) {
  const t      = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  // NextAuth may pass ?error= in the callback URL
  const urlError = searchParams.get('error')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email:    email.toLowerCase().trim(),
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(t('invalidCredentials'))
        setLoading(false)
        return
      }

      // Redirect to callbackUrl or dashboard
      const callbackUrl = searchParams.get('callbackUrl') ?? `/${locale}/dashboard`
      router.push(callbackUrl)
      router.refresh()
    } catch {
      setError(t('genericError'))
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* URL-level error (e.g. OAuthAccountNotLinked) */}
      {urlError && !error && (
        <Alert variant="destructive">
          <AlertDescription>{t('sessionExpired')}</AlertDescription>
        </Alert>
      )}

      {/* Inline error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Email */}
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
          error={!!error}
          disabled={loading}
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t('password')}</Label>
          <Link
            href={`/${locale}/auth/forgot-password`}
            className="text-xs text-primary hover:underline"
          >
            {t('forgotPassword')}
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          error={!!error}
          disabled={loading}
        />
      </div>

      <Button type="submit" className="w-full" loading={loading}>
        {t('signIn')}
      </Button>
    </form>
  )
}
