// TagNavigation — Navegação por tags do blog (Server Component)
// Rastreabilidade: CL-150, TASK-6 ST003

import Link from 'next/link'
import { Tag } from 'lucide-react'
import { listBlogTags } from '@/lib/data/blog.data'

const MAX_VISIBLE_TAGS = 20

interface TagNavigationProps {
  locale: string
  currentTag?: string
  className?: string
}

export async function TagNavigation({ locale, currentTag, className }: TagNavigationProps) {
  const allTags = await listBlogTags()
  const visibleTags = allTags.slice(0, MAX_VISIBLE_TAGS)
  const hasMore = allTags.length > MAX_VISIBLE_TAGS

  if (visibleTags.length === 0) return null

  return (
    <nav
      aria-label="Navegação por tags"
      data-testid="tag-navigation"
      className={`space-y-3 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Tag className="h-4 w-4" />
        <span>Explorar por Tag</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleTags.map(({ tag, count }) => {
          const isActive = tag === currentTag
          return (
            <Link
              key={tag}
              href={`/${locale}/blog/tags/${encodeURIComponent(tag)}`}
              data-testid={`tag-link-${tag}`}
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {tag}
              <span className="text-[10px] opacity-60">{count}</span>
            </Link>
          )
        })}

        {hasMore && (
          <Link
            href={`/${locale}/blog`}
            className="inline-flex items-center rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            +{allTags.length - MAX_VISIBLE_TAGS} mais
          </Link>
        )}
      </div>
    </nav>
  )
}
