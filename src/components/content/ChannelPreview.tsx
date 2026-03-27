'use client'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Channel } from '@prisma/client'

interface ChannelPreviewProps {
  channel: Channel
  body: string
  hashtags: string[]
  ctaText: string | null
  className?: string
}

const CHANNEL_CONFIG: Record<string, { label: string; badgeVariant: 'linkedin' | 'instagram' | 'blog' }> = {
  LINKEDIN: { label: 'LinkedIn', badgeVariant: 'linkedin' },
  INSTAGRAM: { label: 'Instagram', badgeVariant: 'instagram' },
  BLOG: { label: 'Blog', badgeVariant: 'blog' },
}

export function ChannelPreview({ channel, body, hashtags, ctaText, className }: ChannelPreviewProps) {
  const config = CHANNEL_CONFIG[channel] ?? { label: channel, badgeVariant: 'blog' as const }

  return (
    <Card
      variant="surface"
      className={cn('p-4', className)}
      aria-label={`Preview do post no ${config.label}`}
      role="article"
      data-testid={`channel-preview-${channel}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Badge variant={config.badgeVariant}>{config.label}</Badge>
        <span className="text-xs text-muted-foreground">Preview</span>
      </div>

      {channel === 'LINKEDIN' && (
        <LinkedInPreview body={body} ctaText={ctaText} />
      )}
      {channel === 'INSTAGRAM' && (
        <InstagramPreview body={body} hashtags={hashtags} />
      )}
      {channel === 'BLOG' && (
        <BlogPreview body={body} />
      )}
    </Card>
  )
}

function LinkedInPreview({ body, ctaText }: { body: string; ctaText: string | null }) {
  return (
    <div className="space-y-3" data-testid="linkedin-preview-content">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-10 w-10 rounded-full bg-muted" />
        <div>
          <p className="text-sm font-semibold text-foreground">Seu Perfil</p>
          <p className="text-xs text-muted-foreground">Consultor Inbound Marketing</p>
        </div>
      </div>
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {body.slice(0, 300)}
        {body.length > 300 && <span className="text-muted-foreground">...ver mais</span>}
      </p>
      {ctaText && (
        <div className="rounded-md border border-border p-3 bg-muted/50">
          <p className="text-xs font-medium text-primary">{ctaText}</p>
        </div>
      )}
    </div>
  )
}

function InstagramPreview({ body, hashtags }: { body: string; hashtags: string[] }) {
  return (
    <div className="space-y-3" data-testid="instagram-preview-content">
      <div className="aspect-square w-full max-w-[280px] mx-auto rounded-md bg-muted flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Imagem do post</span>
      </div>
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {body.slice(0, 200)}
        {body.length > 200 && <span className="text-muted-foreground">...</span>}
      </p>
      {hashtags.length > 0 && (
        <p className="text-xs text-primary">
          {hashtags.join(' ')}
        </p>
      )}
    </div>
  )
}

function BlogPreview({ body }: { body: string }) {
  return (
    <div className="space-y-3" data-testid="blog-preview-content">
      <div className="prose prose-sm max-w-none">
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {body.slice(0, 500)}
          {body.length > 500 && <span className="text-muted-foreground">...</span>}
        </p>
      </div>
    </div>
  )
}
