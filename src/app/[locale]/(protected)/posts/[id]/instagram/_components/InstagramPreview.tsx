import Image from 'next/image'
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InstagramPreviewProps {
  caption: string
  hashtags: string[]
  imageUrl: string | null
  accountName?: string
  className?: string
}

export function InstagramPreview({
  caption,
  hashtags,
  imageUrl,
  accountName = 'inbound.forge',
  className,
}: InstagramPreviewProps) {
  const hashtagsLine = hashtags.map((tag) => `#${tag.replace(/^#/, '')}`).join(' ')
  const renderedCaption = [caption.trim(), hashtagsLine].filter(Boolean).join('\n\n')

  return (
    <section
      aria-label="Preview do feed Instagram"
      className={cn('overflow-hidden rounded-lg border border-border bg-card text-card-foreground', className)}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            IF
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{accountName}</p>
            <p className="text-xs text-muted-foreground">Feed portrait</p>
          </div>
        </div>
        <MoreHorizontal className="h-5 w-5 text-muted-foreground" aria-hidden />
      </div>

      <div className="relative aspect-[4/5] w-full bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="Arte do post no formato Instagram"
            fill
            sizes="(min-width: 1024px) 520px, 100vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Imagem obrigatória para publicar no Instagram.
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Heart className="h-5 w-5" aria-hidden />
            <MessageCircle className="h-5 w-5" aria-hidden />
            <Send className="h-5 w-5" aria-hidden />
          </div>
          <Bookmark className="h-5 w-5" aria-hidden />
        </div>
        <p className="text-sm font-semibold">42 curtidas</p>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          <span className="font-semibold">{accountName}</span>{' '}
          {renderedCaption || <span className="text-muted-foreground">Legenda vazia.</span>}
        </p>
      </div>
    </section>
  )
}
