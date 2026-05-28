/**
 * Zod validation schemas — shared between API routes and client forms.
 *
 * Every API route validates its input against these schemas before touching
 * the database. Client components use the same schemas for immediate feedback.
 */
import { z } from 'zod'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters').max(100),
  email:    z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  locale:   z.enum(['ar', 'en']).default('ar'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const resetPasswordSchema = z.object({
  token:    z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  confirm:  z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirm, {
  message: 'Passwords do not match',
  path:    ['confirm'],
})

// ─── Courses ──────────────────────────────────────────────────────────────────

export const createCourseSchema = z.object({
  titleEn:      z.string().min(3).max(200),
  titleAr:      z.string().min(3).max(200),
  descriptionEn: z.string().min(10),
  descriptionAr: z.string().min(10),
  shortDescEn:   z.string().min(5).max(300),
  shortDescAr:   z.string().min(5).max(300),
  price:         z.number().min(0),
  isMemberOnly:  z.boolean().default(false),
  categoryEn:    z.string().optional(),
  categoryAr:    z.string().optional(),
  level:         z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
})

export const createLessonSchema = z.object({
  titleEn:       z.string().min(2).max(200),
  titleAr:       z.string().min(2).max(200),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  s3Key:         z.string().optional(),
  duration:      z.number().int().min(0).optional(),
  position:      z.number().int().min(1),
  isPreview:     z.boolean().default(false),
})

// ─── Products ─────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  titleEn:       z.string().min(2).max(200),
  titleAr:       z.string().min(2).max(200),
  descriptionEn: z.string().min(10),
  descriptionAr: z.string().min(10),
  price:         z.number().min(0),
  category:      z.enum(['EBOOK', 'PRINTABLE', 'MONTESSORI_MATERIAL', 'TOY_AFFILIATE']),
  language:      z.enum(['EN', 'AR', 'BILINGUAL']).default('BILINGUAL'),
  s3Key:         z.string().optional(),
  affiliateUrl:  z.string().url().optional(),
})

// ─── Upload ───────────────────────────────────────────────────────────────────

export const presignedUrlSchema = z.object({
  filename:    z.string().min(1),
  contentType: z.string().min(1),
  folder:      z.enum(['courses', 'products', 'temp']),
  entityId:    z.string().min(1),
})

// ─── Type exports ─────────────────────────────────────────────────────────────

export type RegisterInput       = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput  = z.infer<typeof resetPasswordSchema>
export type CreateCourseInput   = z.infer<typeof createCourseSchema>
export type CreateLessonInput   = z.infer<typeof createLessonSchema>
export type CreateProductInput  = z.infer<typeof createProductSchema>
