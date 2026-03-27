'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'info' | 'success' | 'danger' | 'primary'; pulse?: boolean }> = {
  DRAFT: { label: 'Rascunho', variant: 'default' },
  REVIEW: { label: 'Gerando...', variant: 'info', pulse: true },
  APPROVED: { label: 'Aprovado', variant: 'success' },
  REJECTED: { label: 'Rejeitado', variant: 'danger' },
  PUBLISHED: { label: 'Publicado', variant: 'primary' },
  PENDING_ART: { label: 'Aguardando Arte', variant: 'info' },
  FAILED: { label: 'Erro', variant: 'danger' },
}

interface ContentStatusBadgeProps {
  status: string
  className?: string
}

export function ContentStatusBadge({ status, className }: ContentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'default' as const }

  return (
    <Badge
      variant={config.variant}
      className={cn(config.pulse && 'animate-pulse', className)}
      role="status"
      data-testid="content-status-badge"
    >
      {config.label}
    </Badge>
  )
}
