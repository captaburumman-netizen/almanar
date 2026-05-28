import { Suspense }           from 'react'
import { getTranslations }    from 'next-intl/server'
import Link                   from 'next/link'
import { AuthCard }            from '@/components/auth/AuthCard'
import { ResetPasswordForm }   from '@/components/auth/ResetPasswordForm'
import type { Locale } from '@/i18n/routing'

interface ResetPasswordPageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: ResetPasswordPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return { title: t('resetPasswordTitle') }
}

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })

  return (
    <AuthCard
      title={t('resetPasswordTitle')}
      description={t('resetPasswordDescription')}
      footer={
        <Link href={`/${locale}/auth/signin`} className="text-primary hover:underline">
          ← {t('backToSignIn')}
        </Link>
      }
    >
      {/* Suspense required: ResetPasswordForm uses useSearchParams() */}
      <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
        <ResetPasswordForm locale={locale} />
      </Suspense>
    </AuthCard>
  )
}
