import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import type { BlogArticle } from '@/types/blog'

interface ArticleCardProps {
  article: BlogArticle
  locale: string
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function ArticleCard({ article, locale }: ArticleCardProps) {
  const href = `/${locale}/blog/${article.slug}`

  return (
    <article
      data-testid={`article-card-${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
    >
      {article.featuredImageUrl && (
        <Link href={href} className="relative block aspect-video overflow-hidden">
          <Image
            src={article.featuredImageUrl}
            alt={article.coverImageAlt ?? article.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        </Link>
      )}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold text-foreground line-clamp-2">
          <Link href={href} className="hover:text-primary transition-colors">
            {article.title}
          </Link>
        </h2>

        {article.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {article.excerpt}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-3">
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {article.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="default">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {article.authorName && <span>{article.authorName}</span>}
            {article.authorName && article.publishedAt && (
              <span aria-hidden="true">&middot;</span>
            )}
            {article.publishedAt && (
              <time dateTime={new Date(article.publishedAt).toISOString()}>
                {formatDate(article.publishedAt)}
              </time>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
