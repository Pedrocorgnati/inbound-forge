'use client'

import Image from 'next/image'
import { MoreHorizontal, GripVertical, Instagram, Linkedin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChannelBadge } from '@/components/publishing/ChannelBadge'
import { QueueStatusBadge } from '@/components/publishing/QueueStatusBadge'
import type { PublishingPost } from '@/types/publishing'

interface PostMiniCardProps {
  post: PublishingPost
  compact?: boolean
  dragAttributes?: Record<string, unknown>
  dragListeners?: Record<string, unknown>
  isDragging?: boolean
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  INSTAGRAM: <Instagram className="h-4 w-4 text-pink-500" />,
  LINKEDIN: <Linkedin className="h-4 w-4 text-blue-600" />,
}

function formatTime(date: Date | string | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function PostMiniCard({
  post,
  compact = false,
  dragAttributes,
  dragListeners,
  isDragging = false,
}: PostMiniCardProps) {
  const truncatedCaption =
    post.caption.length > 40 ? post.caption.slice(0, 40) + '...' : post.caption

  return (
    <div
      role="article"
      aria-label={`Post: ${post.caption}, Canal: ${post.channel}, Status: ${post.status}`}
      className={cn(
        'group relative flex min-h-[44px] items-start gap-2 rounded-md border border-gray-200 bg-white p-2 shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'opacity-50',
        compact && 'p-1.5 text-xs',
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="mt-0.5 shrink-0 cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
        aria-label="Arrastar para reagendar"
        {...dragAttributes}
        {...dragListeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Thumbnail or channel icon */}
      <div className="shrink-0">
        {post.imageUrl ? (
          <Image
            src={post.imageUrl}
            alt=""
            width={compact ? 28 : 36}
            height={compact ? 28 : 36}
            className="rounded object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded bg-gray-100">
            {CHANNEL_ICONS[post.channel] ?? null}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium text-gray-900', compact && 'text-xs')}>
          {truncatedCaption}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <ChannelBadge channel={post.channel} />
          <QueueStatusBadge status={post.status} />
          {post.scheduledAt && (
            <span className="text-xs text-gray-500">{formatTime(post.scheduledAt)}</span>
          )}
        </div>
      </div>

      {/* Menu */}
      <button
        type="button"
        className="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
        aria-label="Mais opcoes"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  )
}
