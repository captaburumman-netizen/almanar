/**
 * Digital store catalog — /[locale]/store
 * Server-rendered grid with category filter via URL search params.
 */
import { getTranslations }  from 'next-intl/server'
import { Link }              from '@/i18n/navigation'
import { db }                from '@/lib/db'
import { ProductCard }       from '@/components/store/ProductCard'
import { BundleCard }        from '@/components/store/BundleCard'
import type { Locale }       from '@/i18n/routing'
import type { ProductCategory } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface StorePageProps {
  params:      Promise<{ locale: Locale }>
  searchParams: Promise<{ category?: string }>
}

const CATEGORIES: Array<{ value: ProductCategory | 'ALL'; labelEn: string; labelAr: string }> = [
  { value: 'ALL',               labelEn: 'All',        labelAr: 'الكل'            },
  { value: 'EBOOK',             labelEn: 'Ebooks',     labelAr: 'كتب إلكترونية'   },
  { value: 'PRINTABLE',         labelEn: 'Printables', labelAr: 'قابل للطباعة'    },
  { value: 'MONTESSORI_MATERIAL', labelEn: 'Montessori', labelAr: 'مواد منتسوري'  },
  { value: 'TOY_AFFILIATE',     labelEn: 'Toys',       labelAr: 'توصيات الألعاب'  },
]

export async function generateMetadata({ params }: StorePageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'store' })
  return { title: t('title') }
}

export default async function StorePage({ params, searchParams }: StorePageProps) {
  const { locale }   = await params
  const { category } = await searchParams
  const t            = await getTranslations({ locale, namespace: 'store' })
  const isAr         = locale === 'ar'

  const upperCat = category?.toUpperCase() as ProductCategory | undefined
  const activeCat: ProductCategory | 'ALL' = CATEGORIES.find((c) => c.value === upperCat)?.value ?? 'ALL'

  const [products, bundles] = await Promise.all([
    db.product.findMany({
    where: {
      isPublished: true,
      ...(activeCat !== 'ALL' ? { category: activeCat as ProductCategory } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, slug: true,
      titleEn: true, titleAr: true,
      price: true, isFree: true,
      category: true, language: true,
      coverImage: true, affiliateUrl: true,
    },
  }).catch(() => []),
    db.bundle.findMany({
      where:   { isPublished: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, slug: true,
        titleEn: true, titleAr: true,
        price: true, coverImage: true,
        _count: { select: { items: true } },
      },
    }).catch(() => []),
  ])

  return (
    <div className="py-12 sm:py-16">
      <div className="container-brand">
        {/* Header */}
        <div className="mb-10 space-y-2">
          <h1 className="text-heading-lg font-bold text-warm-brown">{t('title')}</h1>
          <p className="text-body-md text-brand-muted">{t('subtitle')}</p>
        </div>

        {/* Category filter */}
        <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label={isAr ? 'تصفية الفئة' : 'Filter by category'}>
          {CATEGORIES.map(({ value, labelEn, labelAr }) => {
            const href = value === 'ALL' ? '/store' : `/store?category=${value.toLowerCase()}`
            const isActive = activeCat === value
            return (
              <Link
                key={value}
                href={href as '/store'}
                className={[
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
                ].join(' ')}
                aria-current={isActive ? 'true' : undefined}
              >
                {isAr ? labelAr : labelEn}
              </Link>
            )
          })}
        </div>

        {/* Product grid */}
        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={{ ...product, price: product.price.toString() }}
                locale={locale}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-muted-foreground">
              {isAr ? 'لا توجد منتجات في هذه الفئة حاليًا' : 'No products in this category yet'}
            </p>
          </div>
        )}

        {/* Bundles section — only shown when no category filter is active */}
        {activeCat === 'ALL' && bundles.length > 0 && (
          <section className="mt-16" aria-labelledby="bundles-heading">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 id="bundles-heading" className="text-xl font-bold text-warm-brown">
                  {isAr ? 'الباقات' : 'Bundles'}
                </h2>
                <p className="mt-1 text-sm text-brand-muted">
                  {isAr ? 'وفّر أكثر مع مجموعاتنا المميزة' : 'Save more with our curated collections'}
                </p>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {bundles.map((bundle) => (
                <BundleCard
                  key={bundle.id}
                  bundle={{ ...bundle, price: bundle.price.toString() }}
                  locale={locale}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
