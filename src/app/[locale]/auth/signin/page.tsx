import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { AuthCard }   from '@/components/auth/AuthCard'
import { SignInForm } from '@/components/auth/SignInForm'
import type { Locale } from '@/i18n/routing'

interface SignInPageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: SignInPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return { title: t('signInTitle') }
}

export default async function SignInPage({ params }: SignInPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })

  return (
    <AuthCard
      title={t('signInTitle')}
      description={t('signInDescription')}
      footer={
        <>
          {t('noAccount')}{' '}
          <Link href={`/${locale}/auth/signup`} className="text-primary font-medium hover:underline">
            {t('createAccount')}
          </Link>
        </>
      }
    >
      <SignInForm locale={locale} />
    </AuthCard>
  )
}
