'use client'

/**
 * Providers — client-side context wrappers.
 *
 * Combines NextAuth SessionProvider + next-intl NextIntlClientProvider
 * so the root layout stays a Server Component and only this thin
 * wrapper is marked 'use client'.
 */
import { SessionProvider } from 'next-auth/react'
import { NextIntlClientProvider } from 'next-intl'
import type { AbstractIntlMessages } from 'next-intl'

interface ProvidersProps {
  children:  React.ReactNode
  locale:    string
  messages:  AbstractIntlMessages
}

export function Providers({ children, locale, messages }: ProvidersProps) {
  return (
    <SessionProvider>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </SessionProvider>
  )
}
