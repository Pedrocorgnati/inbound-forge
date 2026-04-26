import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { blogService } from '@/lib/services/blog.service'
import { ArticleList } from '@/components/blog/ArticleList'
// searchParams força dynamic rendering — revalidate seria ignorado (ver blog/page.tsx)
export const dynamic = 'force-dynamic'

interface TagPageProps {
  params: Promise<{ locale: string; tag: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { locale, tag } = await params
  const decodedTag = decodeURIComponent(tag)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Inbound Forge'

  return {
    title: `Artigos sobre ${decodedTag} — ${siteName}`,
    description: `Explore todos os artigos sobre ${decodedTag} no blog do ${siteName}.`,
    robots: 'index, follow',
    openGraph: {
      title: `Artigos sobre ${decodedTag}`,
      description: `Explore todos os artigos sobre ${decodedTag}.`,
      type: 'website',
      url: `${baseUrl}/${locale}/blog/tags/${tag}`,
      siteName,
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/blog/tags/${encodeURIComponent(decodedTag)}`,
    },
  }
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { locale, tag } = await params
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const decodedTag = decodeURIComponent(tag)

  const { items, totalPages } = await blogService.listByTag(decodedTag, page, 6)

  return (
    <main data-testid="tag-page">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li>
            <Link href={`/${locale}/blog`} className="hover:text-foreground transition-colors">
              Blog
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li>
            <span className="text-muted-foreground">Tags</span>
          </li>
          <li aria-hidden>
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li aria-current="page" className="font-medium text-foreground">
            {decodedTag}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Artigos sobre <span className="text-primary">{decodedTag}</span>
        </h1>
        {items.length > 0 && (
          <p className="mt-2 text-muted-foreground">
            {items.length === 1 ? '1 artigo encontrado' : `${items.length} artigos encontrados`}
          </p>
        )}
      </div>

      {/* Articles or empty state */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center" data-testid="tag-empty-state">
          <p className="text-muted-foreground">
            Nenhum artigo com a tag <strong>{decodedTag}</strong> encontrado.
          </p>
          <Link
            href={`/${locale}/blog`}
            className="text-sm text-primary hover:underline"
          >
            Ver todos os artigos
          </Link>
        </div>
      ) : (
        <ArticleList
          articles={items}
          locale={locale}
          page={page}
          totalPages={totalPages}
        />
      )}
    </main>
  )
}
