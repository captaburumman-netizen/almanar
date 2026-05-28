/**
 * /auth/signin — locale-aware redirect shim.
 *
 * NextAuth's pages.signIn must be set to '/auth/signin' (no locale prefix)
 * so that the library can build the callback URL correctly.
 * This page reads the preferred locale from a cookie and redirects
 * to the localised sign-in page: /{locale}/auth/signin.
 *
 * The ?callbackUrl= param is forwarded so the user ends up in the right
 * place after authentication.
 */
import { redirect } from 'next/navigation'
import { cookies }  from 'next/headers'

interface SearchParams {
  callbackUrl?: string
  error?:       string
}

export default async function AuthSignInShim({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const cookieStore = await cookies()
  // next-intl stores the locale in NEXT_LOCALE cookie
  const locale = cookieStore.get('NEXT_LOCALE')?.value ?? 'ar'

  const sp    = await searchParams
  const qs    = new URLSearchParams()

  if (sp.callbackUrl) qs.set('callbackUrl', sp.callbackUrl)
  if (sp.error)       qs.set('error', sp.error)

  const query = qs.toString() ? `?${qs.toString()}` : ''
  redirect(`/${locale}/auth/signin${query}`)
}
