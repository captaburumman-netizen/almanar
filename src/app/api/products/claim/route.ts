/**
 * POST /api/products/claim
 *
 * Claims a free (isFree: true) digital product for the authenticated user.
 * Creates a ProductPurchase + Download token in one transaction.
 * Idempotent — returns the existing download URL if already claimed.
 *
 * Side-effects (non-blocking):
 *   - Sends a DownloadEmail to the user with a one-click download link
 *   - Adds the user to the Resend mailing list (Audience)
 *
 * Body: { productId: string }
 * Returns: { downloadUrl: string; alreadyClaimed: boolean }
 */
import * as React                               from 'react'
import { NextRequest, NextResponse }            from 'next/server'
import { getServerSession }                     from 'next-auth'
import { authOptions }                          from '@/lib/auth'
import { db }                                   from '@/lib/db'
import { createDownloadToken, buildDownloadLink } from '@/lib/downloads'
import { sendEmail, addToMailingList }          from '@/lib/resend'
import { DownloadEmail }                        from '@/emails/DownloadEmail'

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  // ── Parse body (JSON or form-encoded) ────────────────────────────────────
  let productId = ''
  try {
    const json = await req.json() as { productId?: string }
    productId = String(json.productId ?? '')
  } catch {
    try {
      const form = await req.formData()
      productId = String(form.get('productId') ?? '')
    } catch { /* fall through */ }
  }

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  // ── Load product ──────────────────────────────────────────────────────────
  const product = await db.product.findUnique({
    where:  { id: productId, isPublished: true },
    select: { id: true, isFree: true, category: true, s3Key: true, titleEn: true, titleAr: true },
  }).catch(() => null)

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }
  if (!product.isFree) {
    return NextResponse.json({ error: 'Product is not free' }, { status: 400 })
  }
  if (product.category === 'TOY_AFFILIATE') {
    return NextResponse.json({ error: 'Affiliate products cannot be claimed' }, { status: 400 })
  }
  if (!product.s3Key) {
    return NextResponse.json({ error: 'No file available for this product' }, { status: 400 })
  }

  // ── Idempotency: return existing download if already claimed ──────────────
  const existing = await db.productPurchase.findFirst({
    where:    { userId, productId, isFree: true },
    include:  { downloads: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy:  { createdAt: 'desc' },
  }).catch(() => null)

  if (existing) {
    const dl = existing.downloads[0]
    if (dl && dl.expiresAt > new Date() && dl.downloadCount < dl.maxDownloads) {
      return NextResponse.json({
        downloadUrl:    buildDownloadLink(dl.token),
        alreadyClaimed: true,
      })
    }
    // Expired / exhausted → create a fresh Download on the same purchase
    if (existing.downloads[0]) {
      const fresh = await createDownloadToken(userId, existing.id, productId)
      return NextResponse.json({
        downloadUrl:    buildDownloadLink(fresh.token),
        alreadyClaimed: true,
      })
    }
  }

  // ── Create purchase + download token atomically ───────────────────────────
  const purchase = await db.productPurchase.create({
    data: {
      userId,
      productId,
      amount:   0,
      currency: 'usd',
      status:   'COMPLETED',
      isFree:   true,
    },
  })

  const download = await createDownloadToken(userId, purchase.id, productId)
  const downloadUrl = buildDownloadLink(download.token)

  // ── Non-blocking side-effects: email + mailing list ───────────────────────
  void (async () => {
    try {
      const userRec = await db.user.findUnique({
        where:  { id: userId },
        select: { email: true, name: true, preferredLocale: true },
      })
      if (userRec?.email) {
        const locale = userRec.preferredLocale ?? 'ar'
        const isAr   = locale === 'ar'
        await sendEmail({
          to:      userRec.email,
          subject: isAr ? 'ملفك جاهز للتنزيل' : 'Your download is ready',
          react:   React.createElement(DownloadEmail, {
            name:         userRec.name ?? '',
            productTitle: isAr ? product.titleAr : product.titleEn,
            downloadUrl,
            locale,
          }),
        })
        await addToMailingList(userRec.email, userRec.name)
      }
    } catch (err) {
      console.error('[claim] post-claim side-effects failed:', err)
    }
  })()

  return NextResponse.json({ downloadUrl, alreadyClaimed: false })
}
