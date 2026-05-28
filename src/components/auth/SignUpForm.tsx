'use client'

/**
 * SignUpForm — new student registration.
 *
 * Calls POST /api/auth/register then auto-signs-in via signIn('credentials').
 * Client-side Zod validation provides immediate feedback before hitting the API.
 */
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { registerSchema } from '@/lib/validations'
import type { Locale } from '@/i18n/routing'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SignUpFormProps {
  locale: Locale
}

type FieldErrors = Partial<Record<'name' | 'email' | 'password', string[]>>

export function SignUpForm({ locale }: SignUpFormProps) {
  const t      = useTranslations('auth')
  const router = useRouter()

  const [name,         setName]         = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [fieldErrors,  setFieldErrors]  = useState<FieldErrors>({})
  const [globalError,  setGlobalError]  = useState<string | null>(null)
  const [loading,      setLoading]      = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError(null)
    setFieldErrors({})

    // Client-side validation
    const parsed = registerSchema.safeParse({ name, email, password, locale })
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors as FieldErrors)
      return
    }

    setLoading(true)

    try {
      // 1. Register
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email: email.toLowerCase().trim(), password, locale }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          setGlobalError(t('emailTaken'))
        } else if (data.details) {
          setFieldErrors(data.details as FieldErrors)
        } else {
          setGlobalError(data.error ?? t('genericError'))
        }
        setLoading(false)
        return
      }

      // 2. Auto sign-in with the same credentials
      const result = await signIn('credentials', {
        email:    email.toLowerCase().trim(),
        password,
        redirect: false,
      })

      if (result?.error) {
        // Registration succeeded but sign-in failed — send to sign-in page
        router.push(`/${locale}/auth/signin`)
        return
      }

      router.push(`/${locale}/dashboard`)
      router.refresh()
    } catch {
      setGlobalError(t('genericError'))
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {globalError && (
        <Alert variant="destructive">
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">{t('name')}</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={locale === 'ar' ? 'اسمك الكامل' : 'Your full name'}
          error={!!fieldErrors.name}
          disabled={loading}
        />
        {fieldErrors.name?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
        )}
      </div>

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
          error={!!fieldErrors.email}
          disabled={loading}
        />
        {fieldErrors.email?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.email[0]}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          error={!!fieldErrors.password}
          disabled={loading}
        />
        {fieldErrors.password?.[0] ? (
          <p className="text-xs text-destructive">{fieldErrors.password[0]}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
        )}
      </div>

      <Button type="submit" className="w-full" loading={loading}>
        {t('createAccount')}
      </Button>
    </form>
  )
}
