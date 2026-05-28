/**
 * SearchBar — compact search input for the Navbar.
 *
 * Client component: handles keyboard shortcut (/ key) and form submit.
 * On submit it navigates to /[locale]/search?q=...
 *
 * Desktop: shown inline in the navbar right cluster.
 * Mobile: shown inside NavbarMobileMenu.
 */
'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface SearchBarProps {
  locale:       string
  /** Visual variant — 'navbar' renders a compact pill, 'mobile' renders full-width */
  variant?:     'navbar' | 'mobile'
}

export function SearchBar({ locale, variant = 'navbar' }: SearchBarProps) {
  const router  = useRef(useRouter())
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const isAr = locale === 'ar'

  // Press "/" to focus the search bar (unless already in an input)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (!q) return
    router.current.push(`/${locale}/search?q=${encodeURIComponent(q)}`)
    setValue('')
    inputRef.current?.blur()
  }

  if (variant === 'mobile') {
    return (
      <form onSubmit={handleSubmit} role="search" className="px-4 pb-3">
        <label htmlFor="search-mobile" className="sr-only">
          {isAr ? 'بحث' : 'Search'}
        </label>
        <div className="relative">
          <input
            id="search-mobile"
            ref={inputRef}
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isAr ? 'بحث…' : 'Search…'}
            className="w-full rounded-lg border border-border bg-muted/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            aria-label={isAr ? 'بحث' : 'Search'}
            className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <SearchIcon />
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="relative">
      <label htmlFor="search-navbar" className="sr-only">
        {isAr ? 'بحث' : 'Search'}
      </label>
      <input
        id="search-navbar"
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={isAr ? 'بحث… (/)' : 'Search… (/)'}
        className="h-9 w-44 rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:w-56 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
      />
      <button
        type="submit"
        aria-label={isAr ? 'بحث' : 'Search'}
        className="absolute inset-y-0 end-0 flex items-center pe-2.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <SearchIcon />
      </button>
    </form>
  )
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"
      />
    </svg>
  )
}
