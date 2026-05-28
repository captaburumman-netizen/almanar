import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { AuthCard }   from '@/components/auth/AuthCard'
import { SignUpForm } from '@/components/auth/SignUpForm'
import type { Locale } from '@/i18n/routing'

interface SignUpPageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: SignUpPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return { title: t('signUpTitle') }
}

export default async function SignUpPage({ params }: SignUpPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })

  return (
    <AuthCard
      title={t('signUpTitle')}
      description={t('signUpDescription')}
      footer={
        <>
          {t('haveAccount')}{' '}
          <Link href={`/${locale}/auth/signin`} className="text-primary font-medium hover:underline">
            {t('signIn')}
          </Link>
        </>
      }
    >
      <SignUpForm locale={locale} />
    </AuthCard>
  )
}
