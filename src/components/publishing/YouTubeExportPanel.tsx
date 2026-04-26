'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Tag, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyButton } from '@/components/publishing/CopyButton'
import { SkeletonCard } from '@/components/ui/skeleton'

interface YouTubeExportPanelProps {
  postId: string
}

interface PostData {
  title: string
  body: string
  hashtags: string[]
  imageUrl: string | null
}

export function YouTubeExportPanel({ postId }: YouTubeExportPanelProps) {
  const [data, setData] = useState<PostData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/posts/${postId}`)
        if (!res.ok) throw new Error()
        const json = await res.json()
        const post = json.data ?? json
        setData({
          title: post.title ?? post.theme?.title ?? 'YouTube Short',
          body: post.body ?? post.adaptedContent ?? '',
          hashtags: post.hashtags ?? [],
          imageUrl: post.imageUrl ?? null,
        })
      } catch {
        toast.error('Erro ao carregar dados do post')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [postId])

  if (isLoading) return <SkeletonCard />

  const description = data?.body ?? ''
  const tagsLine = (data?.hashtags ?? []).map((h) => h.replace('#', '')).join(', ')
  const fullDescription = `${description}\n\nTags: ${tagsLine}`.trim()

  return (
    <Card data-testid="youtube-export-panel">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-xl" aria-hidden>▶️</span>
          YouTube Shorts
        </CardTitle>
        {/* Pós-MVP badge */}
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          <Info className="h-3 w-3" aria-hidden />
          Pós-MVP
        </span>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info sobre publicação manual */}
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Publicação automática não disponível nesta versão. Copie os dados abaixo e publique
          manualmente via YouTube Studio.
        </div>

        {/* Título */}
        {data?.title && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Título</span>
              <CopyButton text={data.title} label="Copiar título" />
            </div>
            <div
              data-testid="youtube-title"
              className="rounded-md border border-border bg-surface p-3 text-sm text-foreground"
            >
              {data.title}
            </div>
          </div>
        )}

        {/* Descrição */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Descrição</span>
            <CopyButton text={fullDescription} label="Copiar descrição" />
          </div>
          <div
            data-testid="youtube-description"
            className="rounded-md border border-border bg-surface p-3 text-sm whitespace-pre-wrap text-foreground"
          >
            {description}
          </div>
        </div>

        {/* Tags */}
        {tagsLine && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm font-medium text-foreground">
              <Tag className="h-3.5 w-3.5" aria-hidden />
              Tags sugeridas
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(data?.hashtags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {tag.replace('#', '')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Thumbnail */}
        {data?.imageUrl && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Thumbnail</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.imageUrl}
              alt="Thumbnail do post"
              className="rounded-md border border-border object-cover max-h-64 w-full"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
