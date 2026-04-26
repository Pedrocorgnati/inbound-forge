import type { Metadata } from 'next'
import { blogService } from '@/lib/services/blog.service'
import { ArticleList } from '@/components/blog/ArticleList'
import { BlogSearchInput } from '@/components/blog/BlogSearchInput'

interface BlogSearchPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; page?: string }>
}

export const metadata: Metadata = {
  title: 'Buscar artigos',
  robots: { index: false, follow: true },
}

export default async function BlogSearchPage({
  params,
  searchParams,
}: BlogSearchPageProps) {
  const { locale } = await params
  const { q = '', page: pageRaw } = await searchParams
  const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1)
  const query = q.trim().slice(0, 100)

  const hasQuery = query.length >= 2
  const results = hasQuery
    ? await blogService.search(query, page, 10)
    : { items: [], total: 0, page, limit: 10, totalPages: 0 }

  return (
    <main className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">Buscar artigos</h1>
        <BlogSearchInput locale={locale} initialQuery={query} />
        {hasQuery ? (
          <p className="text-sm text-muted-foreground">
            {results.total > 0
              ? `${results.total} resultado(s) para "${query}"`
              : `Nenhum resultado para "${query}"`}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Digite pelo menos 2 caracteres para buscar.
          </p>
        )}
      </header>

      {hasQuery && (
        <ArticleList
          articles={results.items}
          locale={locale}
          page={results.page}
          totalPages={results.totalPages}
        />
      )}
    </main>
  )
}
