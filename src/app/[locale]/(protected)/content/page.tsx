'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { FileText, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SkeletonCard } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { ContentStatusBadge } from '@/components/content/ContentStatusBadge'

interface ContentListItem {
  id: string
  themeId: string
  themeTitle: string
  status: string
  recommendedChannel: string
  selectedAngle: string | null
  anglesCount: number
  updatedAt: string
}

export default function ContentPage() {
  const { locale } = useParams<{ locale: string }>()
  const [items, setItems] = useState<ContentListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContent = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch themes with ACTIVE status, then check which have content
      const themesRes = await fetch('/api/v1/themes?status=ACTIVE&limit=50')
      if (!themesRes.ok) throw new Error('Falha ao carregar temas')
      const themesJson = await themesRes.json()
      const themes: Array<{ id: string; title: string }> = themesJson.data ?? []

      // For each theme, try to fetch its content piece
      const contentItems: ContentListItem[] = []
      const results = await Promise.allSettled(
        themes.map(async (theme) => {
          const res = await fetch(`/api/content/${theme.id}`)
          if (!res.ok) return null
          const piece = await res.json()
          return {
            id: piece.id,
            themeId: theme.id,
            themeTitle: theme.title,
            status: piece.status,
            recommendedChannel: piece.recommendedChannel,
            selectedAngle: piece.selectedAngle,
            anglesCount: piece.angles?.length ?? 0,
            updatedAt: piece.updatedAt,
          } satisfies ContentListItem
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          contentItems.push(result.value)
        }
      }

      // Also include themes without content (they can be used to generate)
      for (const theme of themes) {
        if (!contentItems.find((c) => c.themeId === theme.id)) {
          contentItems.push({
            id: '',
            themeId: theme.id,
            themeTitle: theme.title,
            status: '',
            recommendedChannel: 'LINKEDIN',
            selectedAngle: null,
            anglesCount: 0,
            updatedAt: '',
          })
        }
      }

      setItems(contentItems)
    } catch {
      setError('Não foi possível carregar os conteúdos.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  return (
    <div data-testid="content-page" className="space-y-6">
      <div data-testid="content-header">
        <h1 className="text-2xl font-bold text-foreground">Geração de Conteúdo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Geração e gestão de artigos, posts e material de inbound
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger-bg bg-danger-bg/10 p-4" data-testid="content-error">
          <p className="text-sm text-[#991B1B]">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchContent} className="mt-2">
            Tentar novamente
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="content-loading">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="Nenhum conteúdo ainda"
          description="Adicione temas da base de conhecimento para gerar seu primeiro conteúdo"
        />
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="content-list">
          {items.map((item) => (
            <ContentListCard key={item.themeId} item={item} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}

function ContentListCard({ item, locale }: { item: ContentListItem; locale: string }) {
  const hasContent = item.id !== ''

  const CHANNEL_LABELS: Record<string, string> = {
    LINKEDIN: 'LinkedIn',
    INSTAGRAM: 'Instagram',
    BLOG: 'Blog',
  }

  return (
    <Card
      variant="elevated"
      className="flex flex-col p-5 transition-all"
      data-testid={`content-card-${item.themeId}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        {hasContent ? (
          <ContentStatusBadge status={item.status} />
        ) : (
          <Badge variant="default">Sem conteúdo</Badge>
        )}
        {hasContent && (
          <Badge variant={item.recommendedChannel === 'LINKEDIN' ? 'linkedin' : item.recommendedChannel === 'INSTAGRAM' ? 'instagram' : 'blog'}>
            {CHANNEL_LABELS[item.recommendedChannel] ?? item.recommendedChannel}
          </Badge>
        )}
      </div>

      <h3 className="font-semibold text-foreground line-clamp-2 mt-1">
        {item.themeTitle}
      </h3>

      {hasContent && (
        <p className="mt-1 text-xs text-muted-foreground">
          {item.anglesCount} ângulo{item.anglesCount !== 1 ? 's' : ''} gerado{item.anglesCount !== 1 ? 's' : ''}
        </p>
      )}

      {item.updatedAt && (
        <p className="mt-1 text-xs text-muted-foreground">
          Atualizado: {new Date(item.updatedAt).toLocaleDateString('pt-BR')}
        </p>
      )}

      <div className="mt-auto border-t border-border pt-3 mt-4">
        <Button asChild size="sm" className="min-h-[44px] w-full">
          <Link href={`/${locale}/content/${item.themeId}`} data-testid={`go-to-editor-${item.themeId}`}>
            {hasContent ? (
              <>
                <FileText className="h-4 w-4" />
                Editar Conteúdo
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar Conteúdo
              </>
            )}
          </Link>
        </Button>
      </div>
    </Card>
  )
}
