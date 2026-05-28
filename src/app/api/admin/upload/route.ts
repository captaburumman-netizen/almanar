/**
 * POST /api/admin/upload
 *
 * Returns a short-lived signed S3 PUT URL so the browser can upload
 * lesson videos and product files directly without routing through the server.
 *
 * Body: { key: string; contentType: string }
 *   key         — desired S3 object key (must start with "lessons/" or "products/")
 *   contentType — MIME type of the file being uploaded
 *
 * Returns: { uploadUrl: string; key: string }
 */
import { NextRequest, NextResponse }    from 'next/server'
import { requireAdminSession }          from '@/lib/adminGuard'
import { getSignedUploadUrl }            from '@/lib/s3'

const ALLOWED_PREFIXES = ['lessons/', 'products/', 'covers/', 'thumbnails/']

export async function POST(req: NextRequest) {
  const { error } = await requireAdminSession()
  if (error) return error

  const body = await req.json().catch(() => ({})) as {
    key?:         string
    contentType?: string
  }

  const { key = '', contentType = '' } = body

  if (!key || !contentType) {
    return NextResponse.json(
      { error: 'key and contentType are required' },
      { status: 400 }
    )
  }

  const isAllowed = ALLOWED_PREFIXES.some((p) => key.startsWith(p))
  if (!isAllowed) {
    return NextResponse.json(
      { error: `key must start with one of: ${ALLOWED_PREFIXES.join(', ')}` },
      { status: 400 }
    )
  }

  const uploadUrl = await getSignedUploadUrl(key, contentType, 300)

  return NextResponse.json({ uploadUrl, key })
}

// Note: import s3Keys directly from '@/lib/s3' — route files may not re-export
