/**
 * Shared TypeScript types and interfaces for the ALMANAR platform.
 *
 * Prisma-generated types (from @prisma/client) are used for database models.
 * This file adds supplemental types for API responses, session augmentation,
 * component props, and utility shapes.
 */
import type { Role } from '@prisma/client'
import type { DefaultSession } from 'next-auth'

// ─── NextAuth session augmentation ───────────────────────────────────────────

/* eslint-disable no-unused-vars */
declare module 'next-auth' {
  interface Session {
    user: {
      id:   string
      role: Role
    } & DefaultSession['user']
  }

  interface User {
    role: Role
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id:   string
    role: Role
  }
}

// ─── Locale ───────────────────────────────────────────────────────────────────

export type Locale = 'ar' | 'en'

// ─── API response shape ───────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true
  data:    T
}

export interface ApiError {
  success: false
  error:   string
  details?: Record<string, string[]> // Zod validation errors
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError

// ─── Bilingual model shape ────────────────────────────────────────────────────

/** Fields shared by every bilingual content model */
export interface BilingualFields {
  titleEn: string
  titleAr: string
  descriptionEn: string
  descriptionAr: string
}

// ─── Page params convenience ──────────────────────────────────────────────────

export interface LocaleParams {
  params: Promise<{ locale: string }>
}

export interface LocaleAndSlugParams {
  params: Promise<{ locale: string; slug: string }>
}

export interface LocaleAndIdParams {
  params: Promise<{ locale: string; id: string }>
}

// ─── Course ───────────────────────────────────────────────────────────────────

export interface CourseWithLessons {
  id:           string
  slug:         string
  titleEn:      string
  titleAr:      string
  shortDescEn:  string
  shortDescAr:  string
  thumbnail:    string | null
  price:        string // Prisma Decimal serialised as string
  isMemberOnly: boolean
  isPublished:  boolean
  level:        string
  totalDuration: number | null
  lessons: {
    id:         string
    slug:       string
    titleEn:    string
    titleAr:    string
    duration:   number | null
    position:   number
    isPreview:  boolean
    isPublished: boolean
  }[]
}

// ─── Download ─────────────────────────────────────────────────────────────────

export interface DownloadWithProduct {
  id:            string
  token:         string
  expiresAt:     Date
  downloadCount: number
  maxDownloads:  number
  product: {
    id:          string
    slug:        string
    titleEn:     string
    titleAr:     string
    category:    string
    coverImage:  string | null
  }
}

// ─── Admin analytics ──────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalEnrollments:   number
  enrollmentsLast30d: number
  totalRevenue:       number
  revenueThisMonth:   number
  activeMembers:      number
  totalDownloads:     number
}

export interface RevenueByItem {
  id:       string
  titleEn:  string
  titleAr:  string
  type:     'course' | 'product'
  revenue:  number
  count:    number
}
