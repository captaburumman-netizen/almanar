/**
 * Search results — /[locale]/search?q=...
 *
 * Server-rendered. Groups results into Courses, Products, Bundles.
 * Empty query → prompts the user to type something.
 * No results → empty-state with suggestions.
 */
import Image          from 'next/image'
import { Link }       from '@/i18n/navigation'
import { searchAll }  from '@/lib/search'
import { formatPrice } from '@/lib/utils'
import type { Locale } from '@/i18n/routing'

export const dynamic = 'force-dynamic'

interface SearchPageProps {
  params:      Promise<{ locale: Locale }>
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const { q = '' } = await searchParams
  return {
    title: q ? `"${q}" — Search — ALMANAR` : 'Search — ALMANAR',
  }
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale }    = await params
  const { q = '' }    = await searchParams
  const isAr          = locale === 'ar'

  const results = await searchAll(q).catch(() => ({
    q, courses: [], products: [], bundles: [], total: 0,
  }))

  const hasQuery   = q.trim().length >= 2
  const hasResults = results.total > 0

  return (
    <div className="py-12 sm:py-16">
      <div className="container-brand max-w-3xl space-y-10">

        {/* Search form */}
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {isAr ? 'البحث' : 'Search'}
          </h1>
          <form
            method="get"
            action=""
            className="flex gap-2"
            role="search"
          >
            <label htmlFor="search-input" className="sr-only">
              {isAr ? 'ابحث عن الدورات والمنتجات' : 'Search courses and products'}
            </label>
            <input
              id="search-input"
              type="search"
              name="q"
              defaultValue={q}
              placeholder={isAr ? 'ابحث عن دورة أو منتج…' : 'Search for a course or product…'}
              autoFocus
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
            >
              {isAr ? 'بحث' : 'Search'}
            </button>
          </form>
        </div>

        {/* No query entered */}
        {!hasQuery && (
          <div className="py-16 text-center text-muted-foreground space-y-3">
            <svg className="mx-auto h-12 w-12 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
            </svg>
            <p className="text-sm">{isAr ? 'اكتب كلمة للبحث' : 'Type at least 2 characters to search'}</p>
          </div>
        )}

        {/* Query entered but no results */}
        {hasQuery && !hasResults && (
          <div className="py-16 text-center space-y-4">
            <p className="text-foreground font-medium">
              {isAr
                ? `لا توجد نتائج لـ "${q}"`
                : `No results for "${q}"`}
            </p>
            <p className="text-sm text-muted-foreground">
              {isAr ? 'جرّب كلمات مختلفة أو تصفّح:' : 'Try different terms or browse:'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/courses" className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted transition-colors">
                {isAr ? 'الدورات' : 'Courses'}
              </Link>
              <Link href="/store" className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted transition-colors">
                {isAr ? 'المتجر' : 'Store'}
              </Link>
            </div>
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div className="space-y-10">
            <p className="text-sm text-muted-foreground">
              {isAr
                ? `${results.total} نتيجة لـ "${results.q}"`
                : `${results.total} result${results.total !== 1 ? 's' : ''} for "${results.q}"`}
            </p>

            {/* Courses */}
            {results.courses.length > 0 && (
              <section aria-labelledby="courses-heading">
                <h2 id="courses-heading" className="text-base font-semibold text-foreground mb-4">
                  {isAr ? 'الدورات' : 'Courses'}
                  <span className="ms-2 text-xs text-muted-foreground font-normal">
                    ({results.courses.length})
                  </span>
                </h2>
                <ul className="space-y-3" role="list">
                  {results.courses.map((course) => (
                    <li key={course.id}>
                      <Link
                        href={`/courses/${course.slug}` as `/courses/${string}`}
                        className="flex gap-4 rounded-xl border border-border bg-background p-4 hover:bg-muted/50 transition-colors group"
                      >
                        {/* Thumbnail */}
                        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {course.thumbnail ? (
                            <Image src={course.thumbnail} alt="" fill className="object-cover" sizes="96px" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-terracotta/10">
                              <svg className="h-6 w-6 text-terracotta/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {isAr ? course.titleAr : course.titleEn}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {(isAr ? course.shortDescAr : course.shortDescEn) ?? ''}
                          </p>
                        </div>

                        {/* Price */}
                        <div className="shrink-0 text-sm font-semibold text-foreground self-start">
                          {course.isMemberOnly
                            ? (isAr ? 'للأعضاء' : 'Members')
                            : course.price === 0
                              ? (isAr ? 'مجاني' : 'Free')
                              : formatPrice(course.price, locale, 'USD')}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Products */}
            {results.products.length > 0 && (
              <section aria-labelledby="products-heading">
                <h2 id="products-heading" className="text-base font-semibold text-foreground mb-4">
                  {isAr ? 'المنتجات' : 'Products'}
                  <span className="ms-2 text-xs text-muted-foreground font-normal">
                    ({results.products.length})
                  </span>
                </h2>
                <ul className="space-y-3" role="list">
                  {results.products.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/store/${product.slug}` as `/store/${string}`}
                        className="flex gap-4 rounded-xl border border-border bg-background p-4 hover:bg-muted/50 transition-colors group"
                      >
                        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {product.coverImage ? (
                            <Image src={product.coverImage} alt="" fill className="object-cover" sizes="96px" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-sage/10">
                              <svg className="h-6 w-6 text-sage/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {isAr ? product.titleAr : product.titleEn}
                          </p>
                        </div>
                        <div className="shrink-0 text-sm font-semibold text-foreground self-start">
                          {product.isFree
                            ? (isAr ? 'مجاني' : 'Free')
                            : formatPrice(product.price, locale, 'USD')}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Bundles */}
            {results.bundles.length > 0 && (
              <section aria-labelledby="bundles-heading">
                <h2 id="bundles-heading" className="text-base font-semibold text-foreground mb-4">
                  {isAr ? 'الحزم' : 'Bundles'}
                  <span className="ms-2 text-xs text-muted-foreground font-normal">
                    ({results.bundles.length})
                  </span>
                </h2>
                <ul className="space-y-3" role="list">
                  {results.bundles.map((bundle) => (
                    <li key={bundle.id}>
                      <Link
                        href={`/store/bundles/${bundle.slug}` as `/store/bundles/${string}`}
                        className="flex gap-4 items-center rounded-xl border border-border bg-background p-4 hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <svg className="h-6 w-6 text-primary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {isAr ? bundle.titleAr : bundle.titleEn}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {isAr ? 'حزمة' : 'Bundle'}
                          </p>
                        </div>
                        <div className="shrink-0 text-sm font-semibold text-foreground self-start">
                          {formatPrice(bundle.price, locale, 'USD')}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
