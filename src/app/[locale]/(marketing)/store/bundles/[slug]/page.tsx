/**
 * Bundle detail — /[locale]/store/bundles/[slug]
 *
 * Shows bundle title, description, item list, and purchase CTA.
 */
import { notFound }         from 'next/navigation'
import Image                from 'next/image'
import { getServerSession } from 'next-auth'
import { Link }             from '@/i18n/navigation'
import { db }               from '@/lib/db'
import { authOptions }      from '@/lib/auth'
import { getField, formatPrice } from '@/lib/utils'
import { CouponCheckout }    from '@/components/store/CouponCheckout'
import type { Locale }      from '@/i18n/routing'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ locale: Locale; slug: string }>
}


export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params
  const bundle = await db.bundle.findUnique({ where: { slug }, select: { titleEn: true, titleAr: true } }).catch(() => null)
  if (!bundle) return {}
  return { title: locale === 'ar' ? bundle.titleAr : bundle.titleEn }
}

export default async function BundleDetailPage({ params }: Props) {
  const { locale, slug } = await params
  const isAr = locale === 'ar'

  const [bundle, session] = await Promise.all([
    db.bundle.findUnique({
      where:  { slug, isPublished: true },
      select: {
        id:            true,
        slug:          true,
        titleEn:       true,
        titleAr:       true,
        descriptionEn: true,
        descriptionAr: true,
        price:         true,
        coverImage:    true,
        items: {
          select: {
            id:      true,
            product: {
              select: {
                id:          true,
                titleEn:     true,
                titleAr:     true,
                coverImage:  true,
                category:    true,
              },
            },
          },
        },
      },
    }).catch(() => null),
    getServerSession(authOptions),
  ])

  if (!bundle) notFound()

  const title       = getField(bundle, 'title', locale)
  const description = getField(bundle, 'description', locale)
  const price       = Number(bundle.price)
  const isAuthed    = !!session?.user

  // Check if user already owns the bundle
  const alreadyPurchased = isAuthed
    ? await db.productPurchase.findFirst({
        where: { userId: session!.user!.id, bundleId: bundle.id, status: 'COMPLETED' },
      }).then(Boolean).catch(() => false)
    : false

  return (
    <div className="py-12 sm:py-16">
      <div className="container-brand max-w-4xl">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/store" className="hover:text-foreground transition-colors">
            {isAr ? 'المتجر' : 'Store'}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground truncate">{title}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_340px] gap-10 items-start">

          {/* ── Left: info ─────────────────────────────────────────────── */}
          <div className="space-y-8">

            {/* Title + description */}
            <div className="space-y-4">
              <span className="inline-block rounded-full bg-warm-brown/10 px-3 py-1 text-xs font-semibold text-warm-brown">
                {isAr ? 'باقة' : 'Bundle'}
              </span>
              <h1 className="text-heading-lg font-bold text-warm-brown leading-tight">{title}</h1>
              <p className="text-brand-muted leading-relaxed">{description}</p>
            </div>

            {/* What's included */}
            <section aria-labelledby="includes-heading">
              <h2 id="includes-heading" className="text-base font-semibold text-foreground mb-4">
                {isAr ? 'محتوى الباقة' : "What's Included"}
              </h2>
              <ul className="space-y-3" role="list">
                {bundle.items.map((item) => {
                  const itemTitle = getField(item.product, 'title', locale)
                  return (
                    <li key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                      {/* Thumbnail */}
                      <div className="relative h-10 w-10 shrink-0 rounded-md overflow-hidden bg-muted">
                        {item.product.coverImage ? (
                          <Image
                            src={item.product.coverImage}
                            alt={itemTitle}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {/* Check + title */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <svg className="h-4 w-4 shrink-0 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium text-foreground truncate">{itemTitle}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>

          {/* ── Right: purchase card ────────────────────────────────────── */}
          <div className="lg:sticky lg:top-24">
            <div className="card-brand overflow-hidden">
              {/* Cover image */}
              <div className="relative aspect-[4/3] bg-sand-dark/20 overflow-hidden">
                {bundle.coverImage ? (
                  <Image
                    src={bundle.coverImage}
                    alt={title}
                    fill
                    className="object-cover"
                    sizes="340px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sand to-warm-brown/10">
                    <svg className="h-12 w-12 text-warm-brown/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="p-5 space-y-4">
                {/* Price */}
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {formatPrice(price, locale, 'USD')}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {isAr
                      ? `${bundle.items.length} منتج في الباقة`
                      : `${bundle.items.length} products included`}
                  </p>
                </div>

                {/* CTA */}
                {alreadyPurchased ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-sage font-medium">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {isAr ? 'اشتريت هذه الباقة' : 'You own this bundle'}
                    </div>
                    <Link
                      href="/dashboard"
                      className="block w-full rounded-lg bg-sage px-4 py-3 text-center text-sm font-semibold text-white hover:bg-sage/90 transition-colors"
                    >
                      {isAr ? 'تنزيل الملفات' : 'Download Files'}
                    </Link>
                  </div>
                ) : isAuthed ? (
                  <CouponCheckout
                    checkoutHref={`/api/store/bundle-checkout?bundleId=${bundle.id}&locale=${locale}`}
                    originalPrice={price}
                    locale={locale}
                    bundleId={bundle.id}
                    buyLabel={isAr ? `اشتري الباقة — ${formatPrice(price, locale, 'USD')}` : `Buy Bundle — ${formatPrice(price, locale, 'USD')}`}
                    note={isAr ? 'دفع آمن عبر Stripe' : 'Secure payment via Stripe'}
                  />
                ) : (
                  <Link
                    href={`/auth/signin?callbackUrl=/${locale}/store/bundles/${slug}` as '/auth/signin'}
                    className="block w-full rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {isAr ? 'سجّل دخولك للشراء' : 'Sign In to Purchase'}
                  </Link>
                )}

                {/* Value note — shown inside CouponCheckout for authenticated users */}
                {!isAuthed && !alreadyPurchased && (
                  <p className="text-center text-xs text-muted-foreground">
                    {isAr ? 'دفع آمن عبر Stripe' : 'Secure payment via Stripe'}
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
