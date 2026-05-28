/**
 * ProductCard — Premium store card with gold hover accents.
 */
import Image    from 'next/image'
import { Link } from '@/i18n/navigation'
import { getField, formatPrice } from '@/lib/utils'
import type { Locale } from '@/i18n/routing'

interface ProductCardProps {
  product: {
    id: string; slug: string; titleEn: string; titleAr: string;
    price: string | number; isFree: boolean; category: string;
    language: string; coverImage: string | null; affiliateUrl: string | null;
  }
  locale: Locale
}

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  EBOOK:               { en: 'Ebook',      ar: 'كتاب إلكتروني' },
  PRINTABLE:           { en: 'Printable',  ar: 'قابل للطباعة'  },
  MONTESSORI_MATERIAL: { en: 'Montessori', ar: 'منتسوري'       },
  TOY_AFFILIATE:       { en: 'Toy',        ar: 'لعبة'           },
}

const LANGUAGE_LABELS: Record<string, { en: string; ar: string }> = {
  EN:       { en: 'English',   ar: 'إنجليزي'     },
  AR:       { en: 'Arabic',    ar: 'عربي'         },
  BILINGUAL:{ en: 'Bilingual', ar: 'ثنائي اللغة' },
}

export function ProductCard({ product, locale }: ProductCardProps) {
  const isAr  = locale === 'ar'
  const title = getField(product, 'title', locale)
  const price = Number(product.price)
  const cat   = CATEGORY_LABELS[product.category]
  const lang  = LANGUAGE_LABELS[product.language]
  const isAffiliate = product.category === 'TOY_AFFILIATE'

  return (
    <Link
      href={`/store/${product.slug}` as `/store/${string}`}
      className="group block rounded-2xl border border-stone-200 bg-white overflow-hidden hover:border-gold/40 hover:shadow-gold-sm transition-all duration-200 cursor-pointer"
    >
      {/* Cover image */}
      <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
        {product.coverImage ? (
          <Image
            src={product.coverImage}
            alt={title}
            fill
            className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200">
            <svg className="h-12 w-12 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        )}
        {product.isFree && (
          <span className="absolute top-3 start-3 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
            {isAr ? 'مجاني' : 'Free'}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {cat && (
            <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              {isAr ? cat.ar : cat.en}
            </span>
          )}
          {lang && (
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-500">
              {isAr ? lang.ar : lang.en}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-stone-900 leading-snug line-clamp-2 group-hover:text-gold transition-colors duration-150">
          {title}
        </h3>

        {/* Price */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <p className="font-bold text-sm text-stone-900">
            {product.isFree
              ? <span className="text-emerald-600">{isAr ? 'مجاني' : 'Free'}</span>
              : isAffiliate
                ? <span className="text-stone-600">{isAr ? 'عرض التوصية' : 'View →'}</span>
                : formatPrice(price, locale, 'USD')}
          </p>
          <span className="flex items-center gap-1 text-xs font-medium text-stone-400 group-hover:text-gold transition-colors duration-150">
            {isAr ? 'عرض' : 'View'}
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  )
}
