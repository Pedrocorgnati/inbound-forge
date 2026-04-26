import { getTranslations } from 'next-intl/server'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ArticleCard } from './ArticleCard'
import type { BlogArticleSummary } from '@/types/blog'
import { cn } from '@/lib/utils'

interface ArticleListProps {
  articles: BlogArticleSummary[]
  locale: string
  page: number
  totalPages: number
  className?: string
}

export async function ArticleList({
  articles,
  locale,
  page,
  totalPages,
  className,
}: ArticleListProps) {
  const t = await getTranslations('blog.articleList')

  if (articles.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{t('empty')}</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-10', className)}>
      <div
        data-testid="article-list-grid"
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} locale={locale} />
        ))}
      </div>

      {totalPages > 1 && (
        <SeoPagination
          page={page}
          totalPages={totalPages}
          ariaLabel={t('pagination')}
          prevLabel={t('prevPage')}
          nextLabel={t('nextPage')}
        />
      )}
    </div>
  )
}

/* ---------- SEO-friendly pagination with <a> tags ---------- */

interface SeoPaginationProps {
  page: number
  totalPages: number
  ariaLabel: string
  prevLabel: string
  nextLabel: string
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]

  if (current > 3) pages.push('ellipsis')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (current < total - 2) pages.push('ellipsis')

  pages.push(total)

  return pages
}

function SeoPagination({ page, totalPages, ariaLabel, prevLabel, nextLabel }: SeoPaginationProps) {
  const pages = getPageNumbers(page, totalPages)
  const isFirst = page === 1
  const isLast = page === totalPages

  const pageHref = (p: number) => (p === 1 ? '?' : `?page=${p}`)

  return (
    <nav
      role="navigation"
      aria-label={ariaLabel}
      className="flex items-center justify-center gap-1"
    >
      {isFirst ? (
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground opacity-50"
          aria-disabled="true"
        >
          <ChevronLeft className="h-4 w-4" />
        </span>
      ) : (
        <a
          href={pageHref(page - 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted transition-colors"
          aria-label={prevLabel}
        >
          <ChevronLeft className="h-4 w-4" />
        </a>
      )}

      <div className="hidden items-center gap-1 sm:flex">
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span
              key={`ellipsis-${i}`}
              className="px-2 text-sm text-muted-foreground"
            >
              ...
            </span>
          ) : (
            <a
              key={p}
              href={pageHref(p)}
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors',
                p === page
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border hover:bg-muted'
              )}
              aria-label={`${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </a>
          )
        )}
      </div>

      <span className="px-2 text-sm text-muted-foreground sm:hidden">
        {page} / {totalPages}
      </span>

      {isLast ? (
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground opacity-50"
          aria-disabled="true"
        >
          <ChevronRight className="h-4 w-4" />
        </span>
      ) : (
        <a
          href={pageHref(page + 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted transition-colors"
          aria-label={nextLabel}
        >
          <ChevronRight className="h-4 w-4" />
        </a>
      )}
    </nav>
  )
}
