'use client'

// ReconciliationBadge — Badge visual de reconciliação semanal
// Rastreabilidade: CL-091, TASK-5 ST002

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react'
import { NudgeTooltip } from '@/components/onboarding/NudgeTooltip'

interface ReconciliationBadgeProps {
  postsWithoutConversion: number
  leadsWithoutPost: number
  className?: string
}

type BadgeStatus = 'ok' | 'warning' | 'critical'

function getStatus(total: number): BadgeStatus {
  if (total === 0) return 'ok'
  if (total <= 5) return 'warning'
  return 'critical'
}

const STATUS_CONFIG: Record<BadgeStatus, {
  icon: typeof CheckCircle2
  label: string
  bgClass: string
  textClass: string
  borderClass: string
}> = {
  ok: {
    icon: CheckCircle2,
    label: 'Reconciliação OK',
    bgClass: 'bg-green-500/10',
    textClass: 'text-green-700',
    borderClass: 'border-green-500/30',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Atenção',
    bgClass: 'bg-yellow-500/10',
    textClass: 'text-yellow-700',
    borderClass: 'border-yellow-500/30',
  },
  critical: {
    icon: AlertCircle,
    label: 'Divergências',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-700',
    borderClass: 'border-red-500/30',
  },
}

export function ReconciliationBadge({
  postsWithoutConversion,
  leadsWithoutPost,
  className,
}: ReconciliationBadgeProps) {
  const { locale } = useParams<{ locale: string }>()
  const total = postsWithoutConversion + leadsWithoutPost
  const status = getStatus(total)
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  const tooltipMessage = total === 0
    ? 'Todos os posts e leads estão reconciliados.'
    : `${postsWithoutConversion} post(s) sem conversão · ${leadsWithoutPost} lead(s) sem post atribuído`

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
      <Link
        href={`/${locale}/analytics#reconciliation`}
        data-testid="reconciliation-badge"
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 ${config.bgClass} ${config.textClass} ${config.borderClass}`}
        aria-label={`Reconciliação: ${config.label}. ${tooltipMessage}`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {config.label}
        {total > 0 && (
          <span className="ml-0.5 font-mono">{total}</span>
        )}
      </Link>
      <NudgeTooltip message={tooltipMessage} position="bottom" icon="info" />
    </div>
  )
}
