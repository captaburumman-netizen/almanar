/**
 * Locale-aware navigation helpers.
 *
 * Use these instead of next/link and next/navigation directly so that
 * locale prefixes are added/stripped automatically.
 *
 * Usage:
 *   import { Link, useRouter, usePathname, redirect } from '@/i18n/navigation'
 */
import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
