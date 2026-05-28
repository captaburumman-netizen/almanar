'use client'

import { signOut } from 'next-auth/react'

interface SignOutButtonProps {
  locale: string
  label:  string
}

export function SignOutButton({ locale, label }: SignOutButtonProps) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: `/${locale}` })}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      {label}
    </button>
  )
}
