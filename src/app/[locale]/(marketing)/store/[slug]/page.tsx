/**
 * Product detail — /[locale]/store/[slug]
 *
 * Shows product cover, description, price, buy/claim CTA.
 * Free products require authentication to claim.
 */
import { notFound }          from 'next/navigation'
import { getTranslations }   from 'next-intl/server'
import { getServerSession }  from 'next-auth'
import Image                 from 'next/image'
import { Link }              from '@/i18n/navigation'
import { db }                from '@/lib/db'
import { authOptions }       from '@/lib/auth'
import { getField, formatPrice } from '@/lib/utils'
import { buildProductMetadata, productJsonLd } from '@/lib/seo'
import { WishlistButton }    from '@/components/wishlist/WishlistButton'
import { ClaimButton }       from '@/components/store/ClaimButton'
import { CouponCheckout }    from '@/components/store/CouponCheckout'
import { ReviewList }        from '@/components/reviews/ReviewList'
import type { Locale }       from '@/i18n/routing'

export const dynamic = 'force-dynamic'

interface ProductDetailPageProps {
  params: Promise<{ locale: Locale; slug: string }>
}

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  EBOOK:               { en: 'Ebook',      ar: 'كتاب إلكتروني' },
  PRINTABLE:           { en: 'Printable',  ar: 'قابل للطباعة'  },
  MONTESSORI_MATERIAL: { en: 'Montessori', ar: 'مواد منتسوري'  },
  TOY_AFFILIATE:       { en: 'Toy',        ar: 'لعبة'          },
}

const LANGUAGE_LABELS: Record<string, { en: string; ar: string }> = {
  EN:       { en: 'English',   ar: 'إنجليزي'     },
  AR:       { en: 'Arabic',    ar: 'عربي'         },
  BILINGUAL:{ en: 'Bilingual', ar: 'ثنائي اللغة' },
}

export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { locale, slug } = await params
  const product = await db.product.findUnique({
    where:  { slug },
    select: {
      titleEn: true, titleAr: true,
      descriptionEn: true, descriptionAr: true,
      coverImage: true,
    },
  }).catch(() => null)
  if (!product) return {}

  return buildProductMetadata({
    titleEn:       product.titleEn,
    titleAr:       product.titleAr,
    descriptionEn: product.descriptionEn,
    descriptionAr: product.descriptionAr,
    slug,
    coverImage:    product.coverImage,
    locale,
  })
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { locale, slug } = await params
  const isAr             = locale === 'ar'
  const t                = await getTranslations({ locale, namespace: 'store' })

  const [product, session] = await Promise.all([
    db.product.findUnique({
      where:  { slug, isPublished: true },
      select: {
        id: true, slug: true,
        titleEn: true, titleAr: true,
        descriptionEn: true, descriptionAr: true,
        price: true, isFree: true,
        category: true, language: true,
        coverImage: true, affiliateUrl: true,
      },
    }).catch(() => null),
    getServerSession(authOptions),
  ])

  if (!product) notFound()

  const title      = getField(product, 'title', locale)
  const desc       = getField(product, 'description', locale)
  const price      = Number(product.price)
  const cat        = CATEGORY_LABELS[product.category]
  const lang       = LANGUAGE_LABELS[product.language]
  const isAffiliate = product.category === 'TOY_AFFILIATE'
  const isAuthed   = !!session?.user

  // Review eligibility + wishlist state
  const userId = session?.user?.id ?? null
  const wishlistEntry = userId && !isAffiliate
    ? await db.wishlist.findUnique({
        where:  { userId_productId: { userId, productId: product.id } },
        select: { id: true },
      }).catch(() => null)
    : null
  const isWishlisted = !!wishlistEntry

  const [hasPurchased, existingReview] = userId && !isAffiliate && !product.isFree
    ? await Promise.all([
        db.productPurchase.findFirst({
          where:  { userId, productId: product.id, status: 'COMPLETED' },
          select: { id: true },
        }).then(Boolean).catch(() => false),
        db.review.findUnique({
          where:  { userId_productId: { userId, productId: product.id } },
          select: { rating: true, comment: true },
        }).catch(() => null),
      ])
    : [false, null]

  // Review aggregate for JSON-LD
  const reviewStats = !isAffiliate
    ? await db.review.aggregate({
        where:   { productId: product.id, status: 'APPROVED' },
        _avg:    { rating: true },
        _count:  { id: true },
      }).catch(() => null)
    : null

  const jsonLd = productJsonLd({
    titleEn:       product.titleEn,
    titleAr:       product.titleAr,
    descriptionEn: product.descriptionEn,
    slug:          product.slug,
    price,
    isFree:        product.isFree,
    coverImage:    product.coverImage,
    avgRating:     reviewStats?._avg.rating ?? undefined,
    reviewCount:   reviewStats?._count.id   ?? undefined,
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <div className="py-12 sm:py-16">
      <div className="container-brand">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/store" className="hover:text-foreground transition-colors">
            {isAr ? 'المتجر' : 'Store'}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground truncate">{title}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
          {/* Left: details */}
          <div className="space-y-8 min-w-0">
            {/* Cover image */}
            <div className="relative aspect-[4/3] w-full max-w-lg overflow-hidden rounded-xl bg-sand-dark/20">
              {product.coverImage ? (
                <Image src={product.coverImage} alt={title} fill className="object-cover" priority sizes="(max-width: 1024px) 100vw, 50vw" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sand to-sage/20">
                  <svg className="h-16 w-16 text-sage/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {cat && <span className="rounded-full bg-terracotta/10 px-3 py-1 text-sm font-medium text-terracotta">{isAr ? cat.ar : cat.en}</span>}
              {lang && <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">{isAr ? lang.ar : lang.en}</span>}
              {product.isFree && <span className="badge-sage">{isAr ? 'مجاني' : 'Free'}</span>}
            </div>

            {/* Title */}
            <h1 className="text-heading-lg font-bold text-warm-brown">{title}</h1>

            {/* Description */}
            <div className="prose prose-warm max-w-none">
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{desc}</p>
            </div>
          </div>

          {/* Right: sticky purchase card */}
          <div>
            <div className="card-brand p-6 space-y-5 lg:sticky lg:top-24">
              {/* Price + wishlist */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  {product.isFree ? (
                  <p className="text-2xl font-bold text-sage">{isAr ? 'مجاني' : 'Free'}</p>
                ) : isAffiliate ? (
                  <p className="text-base text-muted-foreground">{isAr ? 'رابط تابع' : 'Affiliate link'}</p>
                ) : (
                  <p className="text-2xl font-bold text-foreground">{formatPrice(price, locale, 'USD')}</p>
                )}
                </div>
                {isAuthed && !isAffiliate && (
                  <WishlistButton
                    productId={product.id}
                    initialSaved={isWishlisted}
                    locale={locale}
                  />
                )}
              </div>

              {/* CTA */}
              {isAffiliate ? (
                /* Affiliate: external link */
                <a
                  href={product.affiliateUrl ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-lg bg-primary py-3 text-center font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {t('affiliateLink')} →
                </a>
              ) : product.isFree ? (
                /* Free product */
                isAuthed ? (
                  <ClaimButton
                    productId={product.id}
                    locale={locale}
                    labels={{
                      claim:       t('claimFree'),
                      downloading: isAr ? 'جارٍ الإعداد…' : 'Preparing…',
                      download:    isAr ? 'تنزيل الملف' : 'Download File',
                      claimed:     isAr ? 'تم الحصول عليه' : 'Already Claimed',
                      error:       isAr ? 'حدث خطأ، حاول مجدداً' : 'Something went wrong, please retry',
                    }}
                  />
                ) : (
                  <Link
                    href="/auth/signup"
                    className="block w-full rounded-lg bg-sage py-3 text-center font-semibold text-white hover:bg-sage/90 transition-colors"
                  >
                    {t('claimSignIn')}
                  </Link>
                )
              ) : (
                /* Paid product */
                isAuthed ? (
                  <CouponCheckout
                    checkoutHref={`/api/store/checkout?productId=${product.id}&locale=${locale}`}
                    originalPrice={price}
                    locale={locale}
                    productId={product.id}
                    buyLabel={t('buyFor').replace('{price}', formatPrice(price, locale, 'USD'))}
                    note={t('downloadExpiry')}
                  />
                ) : (
                  <Link
                    href="/auth/signup"
                    className="block w-full rounded-lg bg-primary py-3 text-center font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {isAr ? 'سجّل للشراء' : 'Sign Up to Buy'}
                  </Link>
                )
              )}

              {/* Download note — shown inside CouponCheckout for paid products */}
              {!isAffiliate && !product.isFree && !isAuthed && (
                <p className="text-center text-xs text-muted-foreground">{t('downloadExpiry')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Reviews section */}
        {!isAffiliate && (
          <div className="mt-16 border-t border-border pt-12">
            <ReviewList
              productId={product.id}
              locale={locale}
              canReview={hasPurchased as boolean}
              userReview={existingReview}
            />
          </div>
        )}
      </div>
    </div>
    </>
  )
}
