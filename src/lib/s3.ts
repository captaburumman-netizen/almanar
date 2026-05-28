/**
 * AWS S3 client + signed URL helpers — lazy singleton.
 *
 * The client is created on first use so Next.js build succeeds even when
 * AWS env vars are absent (same pattern as Resend / Stripe).
 *
 * All S3 interactions go through this module.
 * Raw S3 URLs are NEVER exposed to the client — only signed URLs.
 *
 * Bucket layout:
 *   courses/{courseId}/lessons/{lessonId}/video.mp4
 *   products/{productId}/{filename}
 *   uploads/temp/{key}   ← presigned PUT staging
 */
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// ─── Lazy client ──────────────────────────────────────────────────────────────

let _s3: S3Client | null = null

function getS3Client(): S3Client {
  if (_s3) return _s3

  const missing = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET']
    .filter((k) => !process.env[k])

  if (missing.length > 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing S3 env vars: ${missing.join(', ')}`)
    }
    // Development / test — dummy credentials so the module loads without crashing
    _s3 = new S3Client({
      region: 'us-east-1',
      credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' },
    })
    return _s3
  }

  _s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
  return _s3
}

// ─── Constants ────────────────────────────────────────────────────────────────

function getBucket(): string {
  return process.env.AWS_S3_BUCKET ?? ''
}

const CLOUDFRONT_URL = process.env.AWS_CLOUDFRONT_URL ?? ''

// ─── Key builders ─────────────────────────────────────────────────────────────

export const s3Keys = {
  lessonVideo: (courseId: string, lessonId: string, filename = 'video.mp4') =>
    `courses/${courseId}/lessons/${lessonId}/${filename}`,

  productFile: (productId: string, filename: string) =>
    `products/${productId}/${filename}`,

  tempUpload: (key: string) => `uploads/temp/${key}`,
}

// ─── Signed URLs ──────────────────────────────────────────────────────────────

/**
 * Generate a signed GET URL for a private S3 object.
 *
 * @param key      - S3 object key
 * @param ttlSecs  - URL validity in seconds (default: 15 min for video)
 */
export async function getSignedDownloadUrl(
  key: string,
  ttlSecs = 900
): Promise<string> {
  // Prefer CloudFront if configured (avoids per-request S3 signed URL cost)
  if (CLOUDFRONT_URL && ttlSecs <= 900) {
    return `${CLOUDFRONT_URL}/${key}`
  }

  const command = new GetObjectCommand({ Bucket: getBucket(), Key: key })
  return getSignedUrl(getS3Client(), command, { expiresIn: ttlSecs })
}

/**
 * Generate a signed PUT URL so the browser can upload directly to S3
 * without credentials ever leaving the server.
 *
 * @param key         - destination S3 key
 * @param contentType - MIME type (validated server-side)
 * @param ttlSecs     - URL validity in seconds (default: 5 min)
 */
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  ttlSecs = 300
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket:      getBucket(),
    Key:         key,
    ContentType: contentType,
  })
  return getSignedUrl(getS3Client(), command, { expiresIn: ttlSecs })
}

/**
 * Delete an object from S3.
 * Called when a lesson or product is permanently deleted from admin.
 */
export async function deleteS3Object(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key })
  )
}

// ─── Download token TTL ───────────────────────────────────────────────────────

/** Hours a product download link stays valid (from env, default 48h) */
export const DOWNLOAD_TTL_HOURS = Number(
  process.env.DOWNLOAD_LINK_TTL_HOURS ?? 48
)

/** Max times a user can regenerate a download link for one purchase */
export const DOWNLOAD_MAX_REGENERATIONS = Number(
  process.env.DOWNLOAD_MAX_REGENERATIONS ?? 5
)
