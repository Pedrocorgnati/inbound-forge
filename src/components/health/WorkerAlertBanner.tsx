'use client'

/**
 * WorkerAlertBanner — Inbound Forge
 * TASK-4 ST001 / intake-review Sad Paths UI
 *
 * Banner amarelo no health dashboard quando worker tem status ERROR/DEGRADED (CL-127).
 */
import { AlertTriangle } from 'lucide-react'

type WorkerStatus = 'ACTIVE' | 'IDLE' | 'ERROR' | 'DEGRADED'

interface WorkerAlertBannerProps {
  workerType: string
  status: WorkerStatus
  lastError?: string | null
  lastHeartbeat?: Date | string | null
}

function formatTimestamp(ts: Date | string | null | undefined): string {
  if (!ts) return 'desconhecido'
  const d = typeof ts === 'string' ? new Date(ts) : ts
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const WORKER_LABELS: Record<string, string> = {
  SCRAPING: 'Scraping',
  IMAGE: 'Imagens',
  PUBLISHING: 'Publicação',
}

export function WorkerAlertBanner({ workerType, status, lastError, lastHeartbeat }: WorkerAlertBannerProps) {
  if (status !== 'ERROR' && status !== 'DEGRADED') return null

  const label = WORKER_LABELS[workerType] ?? workerType
  const isError = status === 'ERROR'

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-md border px-4 py-3 ${
        isError
          ? 'border-yellow-300 bg-yellow-50 text-yellow-900'
          : 'border-yellow-200 bg-yellow-50/60 text-yellow-800'
      }`}
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600 mt-0.5" aria-hidden />
      <div className="text-sm">
        {isError ? (
          <p>
            <span className="font-semibold">{label} com erro</span>
            {lastHeartbeat && (
              <> — última atividade: {formatTimestamp(lastHeartbeat)}</>
            )}
          </p>
        ) : (
          <p>
            <span className="font-semibold">{label} degradado</span> — verificar fontes e configuração
          </p>
        )}
        {lastError && (
          <p className="mt-1 text-xs text-yellow-700 font-mono truncate max-w-xl">
            {lastError}
          </p>
        )}
      </div>
    </div>
  )
}
