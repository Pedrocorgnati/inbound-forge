import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { blogService } from '@/lib/services/blog.service'
import { ArticleList } from '@/components/blog/ArticleList'
import { TagNavigation } from '@/components/blog/TagNavigation'
import { StickyActionBar } from '@/components/mobile/StickyActionBar' // RESOLVED: FE-009 — StickyActionBar CTA em mobile

// searchParams força dynamic rendering em Next.js 15 App Router,
// tornando revalidate = BLOG_REVALIDATE ineficaz (página nunca seria cacheada).
// force-dynamic é explícito e honesto com o comportamento real da rota.
export const dynamic = 'force-dynamic'

interface BlogPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { locale } = await params
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Inbound Forge'

  return {
    title: `Blog — ${siteName}`,
    description: 'Artigos sobre posicionamento estrategico, inbound marketing B2B e aquisicao de clientes.',
    robots: 'index, follow',
    openGraph: {
      title: `Blog — ${siteName}`,
      description: 'Artigos sobre posicionamento estrategico, inbound marketing B2B e aquisicao de clientes.',
      type: 'website',
      url: `${baseUrl}/${locale}/blog`,
      siteName,
    },
    twitter: {
      card: 'summary',
      title: `Blog — ${siteName}`,
      description: 'Artigos sobre posicionamento estrategico, inbound marketing B2B e aquisicao de clientes.',
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/blog`,
      languages: {
        'pt-BR': `${baseUrl}/pt-BR/blog`,
        'en-US': `${baseUrl}/en-US/blog`,
        'it-IT': `${baseUrl}/it-IT/blog`,
        'es-ES': `${baseUrl}/es-ES/blog`,
      },
    },
  }
}

export default async function BlogPage({ params, searchParams }: BlogPageProps) {
  const { locale } = await params
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)

  const { items, totalPages } = await blogService.listPublished(page, 6)

  return (
    <main data-testid="blog-page">
      <div data-testid="blog-header" className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Blog</h1>
        <p className="mt-2 text-muted-foreground">
          Artigos e insights sobre inbound marketing B2B
        </p>
      </div>

      {/* TagNavigation via Suspense — não bloqueia artigos (T003) */}
      <div className="mb-6">
        <Suspense fallback={null}>
          <TagNavigation locale={locale} />
        </Suspense>
      </div>

      <ArticleList
        articles={items}
        locale={locale}
        page={page}
        totalPages={totalPages}
      />

      {/* Mobile CTA — StickyActionBar oculto em md+ (mobileOnly padrão) */}
      <StickyActionBar>
        <Link
          href={`/${locale}/leads/new`}
          className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] rounded-md bg-primary text-primary-foreground text-sm font-medium px-4 hover:bg-primary/90 transition-colors"
        >
          Fale comigo
        </Link>
      </StickyActionBar>
    </main>
  )
}
