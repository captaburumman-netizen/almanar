/**
 * Wishlist dashboard — /[locale]/dashboard/wishlist
 *
 * Shows the authenticated user's saved courses and products.
 * Each item has a remove button and a link to the detail page.
 */
import Image              from 'next/image'
import { getServerSession } from 'next-auth'
import { Link }           from '@/i18n/navigation'
import { authOptions }    from '@/lib/auth'
import { db }             from '@/lib/db'
import { formatPrice }    from '@/lib/utils'
import { WishlistButton } from '@/components/wishlist/WishlistButton'
import type { Locale }    from '@/i18n/routing'

export const dynamic = 'force-dynamic'

interface WishlistPageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: WishlistPageProps) {
  const { locale } = await params
  return {
    title: locale === 'ar' ? 'محفوظاتي — المنار' : 'My Saved Items — ALMANAR',
  }
}

export default async function WishlistPage({ params }: WishlistPageProps) {
  const { locale } = await params
  const isAr       = locale === 'ar'
  const session    = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const items = await db.wishlist.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id:        true,
      courseId:  true,
      productId: true,
      course: {
        select: {
          id: true, slug: true,
          titleEn: true, titleAr: true,
          shortDescEn: true, shortDescAr: true,
          thumbnail: true, price: true, isMemberOnly: true,
        },
      },
      product: {
        select: {
          id: true, slug: true,
          titleEn: true, titleAr: true,
          coverImage: true, price: true, isFree: true,
        },
      },
    },
  }).catch(() => [])

  const courses  = items.filter((i) => i.course  !== null)
  const products = items.filter((i) => i.product !== null)

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isAr ? 'محفوظاتي' : 'My Saved Items'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length === 0
              ? (isAr ? 'لا توجد عناصر محفوظة بعد.' : 'Nothing saved yet.')
              : isAr
                ? `${items.length} عنصر محفوظ`
                : `${items.length} saved item${items.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {isAr ? 'لوحتي' : 'Dashboard'}
        </Link>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center gap-5 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <svg className="h-8 w-8 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-foreground">
              {isAr ? 'لا توجد عناصر محفوظة' : 'Nothing saved yet'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAr ? 'اضغط على القلب في أي دورة أو منتج لحفظه هنا.' : 'Tap the heart on any course or product to save it here.'}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/courses" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              {isAr ? 'استعرض الدورات' : 'Browse Courses'}
            </Link>
            <Link href="/store" className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
              {isAr ? 'المتجر' : 'Store'}
            </Link>
          </div>
        </div>
      )}

      {/* Saved Courses */}
      {courses.length > 0 && (
        <section aria-labelledby="saved-courses-heading">
          <h2 id="saved-courses-heading" className="text-base font-semibold text-foreground mb-4">
            {isAr ? 'دورات محفوظة' : 'Saved Courses'}
            <span className="ms-2 text-xs text-muted-foreground font-normal">({courses.length})</span>
          </h2>
          <ul className="space-y-3" role="list">
            {courses.map((item) => {
              const c     = item.course!
              const title = isAr ? c.titleAr : c.titleEn
              const desc  = isAr ? c.shortDescAr : c.shortDescEn
              const price = Number(c.price)
              return (
                <li key={item.id} className="flex gap-4 rounded-xl border border-border bg-background p-4">
                  {/* Thumbnail */}
                  <Link
                    href={`/courses/${c.slug}` as `/courses/${string}`}
                    className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-muted"
                  >
                    {c.thumbnail ? (
                      <Image src={c.thumbnail} alt="" fill className="object-cover" sizes="112px" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-terracotta/10">
                        <svg className="h-7 w-7 text-terracotta/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <Link
                      href={`/courses/${c.slug}` as `/courses/${string}`}
                      className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                    >
                      {title}
                    </Link>
                    {desc && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{desc}</p>
                    )}
                    <p className="text-sm font-semibold text-foreground">
                      {c.isMemberOnly
                        ? (isAr ? 'للأعضاء' : 'Member Only')
                        : price === 0
                          ? (isAr ? 'مجاني' : 'Free')
                          : formatPrice(price, locale, 'USD')}
                    </p>
                  </div>

                  {/* Wishlist toggle (to remove) */}
                  <div className="shrink-0 self-start">
                    <WishlistButton
                      courseId={c.id}
                      initialSaved
                      locale={locale}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Saved Products */}
      {products.length > 0 && (
        <section aria-labelledby="saved-products-heading">
          <h2 id="saved-products-heading" className="text-base font-semibold text-foreground mb-4">
            {isAr ? 'منتجات محفوظة' : 'Saved Products'}
            <span className="ms-2 text-xs text-muted-foreground font-normal">({products.length})</span>
          </h2>
          <ul className="space-y-3" role="list">
            {products.map((item) => {
              const p     = item.product!
              const title = isAr ? p.titleAr : p.titleEn
              const price = Number(p.price)
              return (
                <li key={item.id} className="flex gap-4 rounded-xl border border-border bg-background p-4">
                  <Link
                    href={`/store/${p.slug}` as `/store/${string}`}
                    className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-muted"
                  >
                    {p.coverImage ? (
                      <Image src={p.coverImage} alt="" fill className="object-cover" sizes="112px" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-sage/10">
                        <svg className="h-7 w-7 text-sage/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0 space-y-1">
                    <Link
                      href={`/store/${p.slug}` as `/store/${string}`}
                      className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                    >
                      {title}
                    </Link>
                    <p className="text-sm font-semibold text-foreground">
                      {p.isFree
                        ? (isAr ? 'مجاني' : 'Free')
                        : formatPrice(price, locale, 'USD')}
                    </p>
                  </div>
                  <div className="shrink-0 self-start">
                    <WishlistButton
                      productId={p.id}
                      initialSaved
                      locale={locale}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
