'use client'

/**
 * LtrStatusBadge — Inbound Forge
 * TASK-3 ST006 / intake-review LTR Engine
 *
 * Badge visual do status do Learn-to-Rank no dashboard de analytics (CL-030).
 * Verde quando ativo, cinza com barra de progresso quando inativo.
 */
import { useEffect, useState } from 'react'
import { Zap, Clock } from 'lucide-react'

interface LtrStatus {
  active: boolean
  postsCount: number
  conversionsCount: number
  thresholds: { postsRequired: number; conversionsRequired: number }
  progress: { posts: number; conversions: number }
}

export function LtrStatusBadge() {
  const [status, setStatus] = useState<LtrStatus | null>(null)

  useEffect(() => {
    fetch('/api/v1/analytics/ltr-status')
      .then((r) => r.json())
      .then((json) => json.success && setStatus(json.data))
      .catch(() => null)
  }, [])

  if (!status) return null

  if (status.active) {
    return (
      <div
        title="Learn-to-Rank ativo: temas são priorizados por dados reais de conversão"
        className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800"
      >
        <Zap className="h-3.5 w-3.5" aria-hidden />
        LTR Ativo
      </div>
    )
  }

  const postsPercent = Math.round(status.progress.posts * 100)
  const conversionsPercent = Math.round(status.progress.conversions * 100)

  return (
    <div
      title={`Learn-to-Rank inativo — aguardando ${status.thresholds.postsRequired} posts e ${status.thresholds.conversionsRequired} conversões`}
      className="inline-flex flex-col gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600"
    >
      <div className="flex items-center gap-1.5 font-medium text-gray-500">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        LTR Inativo
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-20 text-gray-500">Posts</span>
          <div className="h-1.5 flex-1 rounded-full bg-gray-200">
            <div
              className="h-1.5 rounded-full bg-blue-400 transition-all"
              style={{ width: `${postsPercent}%` }}
              aria-label={`${status.postsCount}/${status.thresholds.postsRequired} posts`}
            />
          </div>
          <span className="w-12 text-right tabular-nums">
            {status.postsCount}/{status.thresholds.postsRequired}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-20 text-gray-500">Conversões</span>
          <div className="h-1.5 flex-1 rounded-full bg-gray-200">
            <div
              className="h-1.5 rounded-full bg-blue-400 transition-all"
              style={{ width: `${conversionsPercent}%` }}
              aria-label={`${status.conversionsCount}/${status.thresholds.conversionsRequired} conversões`}
            />
          </div>
          <span className="w-12 text-right tabular-nums">
            {status.conversionsCount}/{status.thresholds.conversionsRequired}
          </span>
        </div>
      </div>
    </div>
  )
}
