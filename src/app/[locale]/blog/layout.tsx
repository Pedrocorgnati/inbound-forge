import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { CookieConsentProvider } from '@/components/consent/CookieConsentProvider'
import { CookieConsentBanner } from '@/components/consent/CookieConsentBanner'
import { GA4Script } from '@/components/analytics/GA4Script'

interface BlogLayoutProps {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function BlogLayout({ children, params }: BlogLayoutProps) {
  const { locale } = await params

  return (
    <CookieConsentProvider>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          data-testid="blog-breadcrumb"
          className="mb-6"
        >
          <ol className="flex items-center gap-1 text-sm text-muted-foreground">
            <li>
              <Link href={`/${locale}`} className="hover:text-foreground transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li>
              <Link href={`/${locale}/blog`} className="hover:text-foreground transition-colors">
                Blog
              </Link>
            </li>
          </ol>
        </nav>

        {children}
      </div>

      <GA4Script />
      <CookieConsentBanner />
    </CookieConsentProvider>
  )
}
