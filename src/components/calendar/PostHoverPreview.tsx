'use client'

// TASK-14 ST004 (M11.15 / G-005) — Preview expandido on hover/focus para
// posts no calendario. Mostra texto completo + miniatura + canal + horario
// + status. Lazy: so monta quando aberto (caller controla via prop `open`).

import * as React from 'react'
import Image from 'next/image'
import { Instagram, Linkedin, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFormatters } from '@/lib/i18n/formatters'
import { ChannelBadge } from '@/components/publishing/ChannelBadge'
import { QueueStatusBadge } from '@/components/publishing/QueueStatusBadge'
import type { PublishingPost } from '@/types/publishing'

const CHANNEL_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  INSTAGRAM: Instagram,
  LINKEDIN: Linkedin,
  BLOG: Globe,
}

export interface PostHoverPreviewProps {
  post: PublishingPost
  className?: string
}

export function PostHoverPreview({ post, className }: PostHoverPreviewProps) {
  const fmt = useFormatters()
  const Icon = CHANNEL_ICON_MAP[post.channel] ?? Globe

  return (
    <div
      role="dialog"
      aria-label={`Pre-visualizacao do post: ${post.caption.slice(0, 60)}`}
      className={cn(
        'w-80 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {post.imageUrl ? (
          <Image
            src={post.imageUrl}
            alt=""
            width={80}
            height={80}
            className="h-20 w-20 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="h-8 w-8 text-muted-foreground" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <ChannelBadge channel={post.channel} />
            <QueueStatusBadge status={post.status} />
          </div>
          {post.scheduledAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              {fmt.dateTime(post.scheduledAt)}
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {post.caption}
      </p>

      {post.hashtags && post.hashtags.length > 0 && (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          {post.hashtags.slice(0, 8).map((tag) => `#${tag.replace(/^#/, '')}`).join(' ')}
        </p>
      )}
    </div>
  )
}
