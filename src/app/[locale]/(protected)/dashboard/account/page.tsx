/**
 * Account settings — /[locale]/dashboard/account
 *
 * Three sections:
 *   1. Profile — update display name
 *   2. Security — change password (credential accounts only)
 *   3. Language — preferred email language (ar / en)
 */
import { getServerSession }  from 'next-auth'
import { authOptions }       from '@/lib/auth'
import { db }                from '@/lib/db'
import { ProfileForm }       from '@/components/dashboard/ProfileForm'
import { PasswordForm }      from '@/components/dashboard/PasswordForm'
import { LocaleForm }        from '@/components/dashboard/LocaleForm'
import type { Locale }       from '@/i18n/routing'

export const dynamic = 'force-dynamic'

interface AccountPageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: AccountPageProps) {
  const { locale } = await params
  return { title: locale === 'ar' ? 'إعدادات الحساب — المنار' : 'Account Settings — ALMANAR' }
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { locale } = await params
  const isAr       = locale === 'ar'
  const session    = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { name: true, email: true, password: true, preferredLocale: true },
  }).catch(() => null)

  const hasPassword = !!user?.password

  return (
    <div className="max-w-lg space-y-10">
      {/* ── Page title ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isAr ? 'إعدادات الحساب' : 'Account Settings'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.email}
        </p>
      </div>

      {/* ── Profile section ──────────────────────────────────────────────── */}
      <section aria-labelledby="profile-heading" className="card-brand p-6 space-y-4">
        <h2 id="profile-heading" className="text-base font-semibold text-foreground">
          {isAr ? 'معلومات الملف الشخصي' : 'Profile Information'}
        </h2>
        <ProfileForm
          initialName={user?.name ?? ''}
          locale={locale}
        />
      </section>

      {/* ── Security section ─────────────────────────────────────────────── */}
      <section aria-labelledby="security-heading" className="card-brand p-6 space-y-4">
        <h2 id="security-heading" className="text-base font-semibold text-foreground">
          {isAr ? 'الأمان' : 'Security'}
        </h2>

        {hasPassword ? (
          <PasswordForm locale={locale} />
        ) : (
          <div className="rounded-lg bg-muted/60 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {isAr
                ? 'حسابك مرتبط بتسجيل دخول اجتماعي — لا تتوفر كلمة مرور لتغييرها.'
                : 'Your account uses social login — there\'s no password to change.'}
            </p>
          </div>
        )}
      </section>

      {/* ── Language preference ──────────────────────────────────────────── */}
      <section aria-labelledby="language-heading" className="card-brand p-6 space-y-4">
        <h2 id="language-heading" className="text-base font-semibold text-foreground">
          {isAr ? 'لغة الإشعارات' : 'Notification Language'}
        </h2>
        <LocaleForm
          initialLocale={user?.preferredLocale ?? 'ar'}
          locale={locale}
        />
      </section>

      {/* ── Danger zone ──────────────────────────────────────────────────── */}
      <section aria-labelledby="danger-heading" className="card-brand p-6 space-y-3 border-destructive/30">
        <h2 id="danger-heading" className="text-base font-semibold text-foreground">
          {isAr ? 'منطقة الخطر' : 'Danger Zone'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isAr
            ? 'لحذف حسابك أو طلب بيانات شخصية، تواصل مع الدعم.'
            : 'To delete your account or request a copy of your data, please contact support.'}
        </p>
        <a
          href="mailto:support@almanar.co"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          support@almanar.co
        </a>
      </section>
    </div>
  )
}
