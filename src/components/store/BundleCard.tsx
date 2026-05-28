/**
 * BundleCard — displays a product bundle in the store.
 */
import Image    from 'next/image'
import { Link } from '@/i18n/navigation'
import { getField, formatPrice } from '@/lib/utils'
import type { Locale } from '@/i18n/routing'

interface BundleCardProps {
  bundle: {
    id:         string
    slug:       string
    titleEn:    string
    titleAr:    string
    price:      string | number
    coverImage: string | null
    _count:     { items: number }
  }
  locale: Locale
}

export function BundleCard({ bundle, locale }: BundleCardProps) {
  const isAr  = locale === 'ar'
  const title = getField(bundle, 'title', locale)
  const price = Number(bundle.price)

  return (
    <Link
      href={`/store/bundles/${bundle.slug}` as `/store/bundles/${string}`}
      className="group block card-brand overflow-hidden hover:shadow-card transition-shadow duration-200 cursor-pointer"
    >
      {/* Cover image */}
      <div className="relative aspect-[4/3] bg-sand-dark/20 overflow-hidden">
        {bundle.coverImage ? (
          <Image
            src={bundle.coverImage}
            alt={title}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sand to-warm-brown/10">
            <svg className="h-10 w-10 text-warm-brown/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}

        {/* Bundle badge */}
        <span className="absolute top-2 start-2 rounded-full bg-warm-brown px-2.5 py-0.5 text-xs font-semibold text-white">
          {isAr ? 'باقة' : 'Bundle'}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Item count badge */}
        <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {bundle._count.items}{' '}
          {isAr
            ? (bundle._count.items === 1 ? 'منتج' : 'منتجات')
            : (bundle._count.items === 1 ? 'product' : 'products')}
        </span>

        {/* Title */}
        <h3 className="font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>

        {/* Price */}
        <div className="flex items-center justify-between pt-1">
          <p className="font-semibold text-sm text-foreground">
            {formatPrice(price, locale, 'USD')}
          </p>
          <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
            {isAr ? 'عرض →' : 'View →'}
          </span>
        </div>
      </div>
    </Link>
  )
}
