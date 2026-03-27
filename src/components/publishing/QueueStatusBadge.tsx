'use client'

import { cn } from '@/lib/utils'
import type { PostStatus } from '@/types/publishing'

interface QueueStatusBadgeProps {
  status: string
  className?: string
}

const STATUS_STYLES: Record<PostStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  REVIEW: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  PUBLISHED: 'bg-purple-100 text-purple-700',
  FAILED: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<PostStatus, string> = {
  DRAFT: 'Rascunho',
  REVIEW: 'Em revisao',
  APPROVED: 'Aprovado',
  SCHEDULED: 'Agendado',
  PUBLISHED: 'Publicado',
  FAILED: 'Falhou',
}

export function QueueStatusBadge({ status, className }: QueueStatusBadgeProps) {
  const upperStatus = status.toUpperCase() as PostStatus
  const colorClasses = STATUS_STYLES[upperStatus] ?? 'bg-gray-100 text-gray-700'
  const label = STATUS_LABELS[upperStatus] ?? status

  return (
    <span
      role="status"
      aria-label={`Status: ${label}`}
      className={cn(
        'text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1',
        colorClasses,
        className,
      )}
    >
      {label}
    </span>
  )
}
