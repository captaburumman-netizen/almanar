'use client'

import { usePathname } from 'next/navigation'

const TITLE_MAP: Record<string, { en: string; ar: string }> = {
  '/admin':               { en: 'Overview',   ar: 'نظرة عامة'    },
  '/admin/courses':       { en: 'Courses',    ar: 'الدورات'       },
  '/admin/courses/new':   { en: 'New Course', ar: 'دورة جديدة'    },
  '/admin/products':      { en: 'Products',   ar: 'المنتجات'      },
  '/admin/products/new':  { en: 'New Product',ar: 'منتج جديد'     },
  '/admin/bundles':       { en: 'Bundles',    ar: 'الحزم'         },
  '/admin/plans':         { en: 'Plans',      ar: 'خطط العضوية'   },
  '/admin/subscriptions': { en: 'Members',    ar: 'الأعضاء'       },
  '/admin/coupons':       { en: 'Coupons',    ar: 'الكوبونات'     },
  '/admin/reviews':       { en: 'Reviews',    ar: 'التقييمات'     },
  '/admin/broadcast':     { en: 'Broadcast',  ar: 'الإرسال'       },
  '/admin/users':         { en: 'Users',      ar: 'المستخدمون'    },
  '/admin/analytics':     { en: 'Analytics',  ar: 'الإحصائيات'   },
}

function getTitle(pathname: string, isAr: boolean): string {
  for (const [key, labels] of Object.entries(TITLE_MAP)) {
    if (pathname.endsWith(key)) return isAr ? labels.ar : labels.en
  }
  if (pathname.includes('/lessons/')) return isAr ? 'الدرس'   : 'Lesson'
  if (pathname.includes('/courses/')) return isAr ? 'الدورة'  : 'Course'
  if (pathname.includes('/products/'))return isAr ? 'المنتج'  : 'Product'
  if (pathname.includes('/users/'))   return isAr ? 'المستخدم': 'User'
  if (pathname.includes('/bundles/')) return isAr ? 'الحزمة'  : 'Bundle'
  if (pathname.includes('/coupons/')) return isAr ? 'الكوبون' : 'Coupon'
  if (pathname.includes('/plans/'))   return isAr ? 'الخطة'   : 'Plan'
  return isAr ? 'لوحة التحكم' : 'Admin'
}

interface AdminTopBarProps { locale: string }

export function AdminTopBar({ locale }: AdminTopBarProps) {
  const pathname = usePathname()
  const isAr     = locale === 'ar'
  const title    = getTitle(pathname, isAr)

  return (
    <header className="h-14 shrink-0 bg-white border-b border-stone-200 flex items-center justify-between px-6 z-20">
      <h1 className="text-sm font-semibold text-stone-800">{title}</h1>

      <div className="flex items-center gap-3">
        <a
          href={`/${locale}`}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-stone-300 hover:text-stone-900 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          {isAr ? 'الموقع' : 'View Site'}
        </a>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-stone-900 font-bold text-xs cursor-default">
          A
        </div>
      </div>
    </header>
  )
}
