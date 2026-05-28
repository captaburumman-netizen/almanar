/**
 * GET /api/downloads/[token]
 *
 * Token-gated file delivery. The opaque token in the URL is the only
 * credential needed — no session required so links work from email.
 *
 * Checks:
 *   1. Token exists in the Download table
 *   2. Token has not expired
 *   3. downloadCount < maxDownloads
 *   4. Product has an s3Key
 *
 * On success:
 *   - Increments downloadCount
 *   - Generates a short-lived (5 min) signed S3 GET URL
 *   - Redirects the client to that signed URL
 */
import { NextRequest, NextResponse } from 'next/server'
import { db }                        from '@/lib/db'
import { getSignedDownloadUrl }      from '@/lib/s3'

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { token } = await params

  // ── Load download record ─────────────────────────────────────────────────
  const download = await db.download.findUnique({
    where:  { token },
    select: {
      id:            true,
      productId:     true,
      expiresAt:     true,
      downloadCount: true,
      maxDownloads:  true,
    },
  }).catch(() => null)

  if (!download) {
    return new NextResponse('Download link not found.', { status: 404 })
  }

  // ── Validate ──────────────────────────────────────────────────────────────
  if (download.expiresAt < new Date()) {
    return new NextResponse('Download link has expired.', { status: 410 })
  }

  if (download.downloadCount >= download.maxDownloads) {
    return new NextResponse(
      'Download limit reached. Please contact support to get a new link.',
      { status: 429 }
    )
  }

  // ── Load product s3Key ────────────────────────────────────────────────────
  const product = await db.product.findUnique({
    where:  { id: download.productId },
    select: { s3Key: true, titleEn: true },
  }).catch(() => null)

  if (!product?.s3Key) {
    return new NextResponse('File not available. Please contact support.', { status: 404 })
  }

  // ── Increment download counter ────────────────────────────────────────────
  await db.download.update({
    where: { id: download.id },
    data:  { downloadCount: { increment: 1 } },
  }).catch(() => { /* non-fatal — still serve the file */ })

  // ── Generate signed S3 URL (5-minute window) ──────────────────────────────
  const signedUrl = await getSignedDownloadUrl(product.s3Key, 300).catch(() => null)

  if (!signedUrl) {
    return new NextResponse('Could not generate download link. Please try again.', { status: 500 })
  }

  // Redirect with cache-busting headers to prevent browser caching the signed URL
  return NextResponse.redirect(signedUrl, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma':        'no-cache',
    },
  })
}
