'use client'

import { Clock, ExternalLink, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export type ApprovalType = 'theme' | 'content' | 'post' | 'blog'
export type ApprovalPriority = 'critical' | 'high' | 'medium' | 'low'

export type ApprovalItem = {
  type: ApprovalType
  id: string
  title: string
  priority: ApprovalPriority
  priority_score: number
  created_at: string
  detail_href: string
  approve: {
    method: 'PATCH' | 'POST'
    endpoint: string
    body?: Record<string, unknown>
  }
  meta: {
    source: string
    description: string
    channel?: string
  }
}

const TYPE_LABEL: Record<ApprovalType, string> = {
  theme: 'Tema',
  content: 'Conteúdo',
  post: 'Post',
  blog: 'Blog',
}

const PRIORITY_LABEL: Record<ApprovalPriority, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
}

const PRIORITY_VARIANT: Record<ApprovalPriority, 'danger' | 'warning' | 'info' | 'default'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
}

function formatAge(value: string) {
  const created = new Date(value).getTime()
  if (Number.isNaN(created)) return 'idade indisponível'

  const diffMinutes = Math.max(1, Math.floor((Date.now() - created) / 60_000))
  if (diffMinutes < 60) return `${diffMinutes} min`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} h`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} d`
}

interface ApprovalCardProps {
  item: ApprovalItem
  isApproving: boolean
  onApprove: (item: ApprovalItem) => void
  onOpenDetail: (item: ApprovalItem) => void
}

export function ApprovalCard({
  item,
  isApproving,
  onApprove,
  onOpenDetail,
}: ApprovalCardProps) {
  const hasActionPayload =
    item.type !== 'content' || Boolean(item.approve.body && 'angleId' in item.approve.body)

  return (
    <Card variant="elevated" className="overflow-hidden" data-testid={`approval-card-${item.type}-${item.id}`}>
      <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">{TYPE_LABEL[item.type]}</Badge>
            {item.meta.channel && <Badge variant="default">{item.meta.channel}</Badge>}
            <Badge variant={PRIORITY_VARIANT[item.priority]}>
              {PRIORITY_LABEL[item.priority]}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {formatAge(item.created_at)}
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
              {item.title}
            </h2>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {item.meta.description}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Prioridade {item.priority_score} - fonte {item.meta.source}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
          <Button
            type="button"
            size="sm"
            onClick={() => onApprove(item)}
            disabled={!hasActionPayload || isApproving}
            isLoading={isApproving}
            loadingText="Aprovando"
            data-testid={`approval-approve-${item.type}-${item.id}`}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Aprovar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenDetail(item)}
            disabled={isApproving}
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Detalhe
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
