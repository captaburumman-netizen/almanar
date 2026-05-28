/**
 * Marketing layout — wraps all public marketing pages with Navbar + Footer.
 * Route group (marketing) keeps URLs unchanged (no extra path segment).
 */
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

interface MarketingLayoutProps {
  children: React.ReactNode
  params:   Promise<{ locale: string }>
}

export default async function MarketingLayout({ children, params }: MarketingLayoutProps) {
  const { locale } = await params

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar locale={locale} />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} />
    </div>
  )
}
