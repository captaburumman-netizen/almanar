import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { AuthCard }           from '@/components/auth/AuthCard'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import type { Locale } from '@/i18n/routing'

interface ForgotPasswordPageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: ForgotPasswordPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return { title: t('forgotPasswordTitle') }
}

export default async function ForgotPasswordPage({ params }: ForgotPasswordPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })

  return (
    <AuthCard
      title={t('forgotPasswordTitle')}
      description={t('forgotPasswordDescription')}
      footer={
        <Link href={`/${locale}/auth/signin`} className="text-primary hover:underline">
          ← {t('backToSignIn')}
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  )
}
