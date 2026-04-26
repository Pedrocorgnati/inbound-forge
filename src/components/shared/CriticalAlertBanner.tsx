'use client'

// TASK-3 ST003 — Banner global persistente para alertas criticos
// Rastreabilidade: CL-091

import Link from 'next/link'
import { AlertOctagon } from 'lucide-react'
import { useCriticalAlerts } from '@/hooks/useCriticalAlerts'

export function CriticalAlertBanner() {
  const { criticalAlerts, hasCritical } = useCriticalAlerts()

  if (!hasCritical) return null

  const top = criticalAlerts[0]
  const count = criticalAlerts.length

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="critical-alert-banner"
      className="flex items-center gap-3 border-b border-red-400 bg-red-50 px-4 py-2 text-sm text-red-900"
    >
      <AlertOctagon className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
      <div className="flex-1 min-w-0">
        <span className="font-semibold">
          {count > 1 ? `${count} alertas criticos` : 'Alerta critico'}:
        </span>{' '}
        <span className="truncate">{top.message}</span>
      </div>
      <Link
        href={`/health?alert=${top.id}`}
        className="shrink-0 rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
      >
        Ver detalhes
      </Link>
    </div>
  )
}
