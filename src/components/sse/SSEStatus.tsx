'use client'

/**
 * TAREFA-018: indicador de status de conexao SSE (Zero Silencio).
 *
 * Consome `useSSE(channel)` e renderiza o estado corrente
 * (`connecting | open | reconnecting | offline`) mais o ultimo erro de stream
 * com timestamp visivel ao usuario. Cada estado tem rotulo e cor proprios — sem
 * estado indefinido. Quando opera via fallback de polling, sinaliza
 * explicitamente (ST002/ST004) em vez de mascarar a degradacao.
 */
import { cn } from '@/lib/utils'
import { useSSE, type SSEConnectionStatus } from '@/hooks/useSSE'
import type { SSEChannel } from '@/lib/sse/events'

interface SSEStatusProps {
  channel: SSEChannel
  /** Endpoint REST de fallback repassado ao hook (ST002/ST004). */
  pollUrl?: string
  /** Esconde o rotulo textual, mantendo apenas o ponto de status. */
  compact?: boolean
  className?: string
}

const STATUS_META: Record<
  SSEConnectionStatus,
  { label: string; dot: string; text: string }
> = {
  connecting: { label: 'Conectando', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-600' },
  open: { label: 'Ao vivo', dot: 'bg-emerald-500', text: 'text-emerald-600' },
  reconnecting: { label: 'Reconectando', dot: 'bg-amber-500 animate-pulse', text: 'text-amber-600' },
  offline: { label: 'Offline (fallback)', dot: 'bg-red-500', text: 'text-red-600' },
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString('pt-BR')
}

export function SSEStatus({ channel, pollUrl, compact = false, className }: SSEStatusProps) {
  const { status, lastError, reconnectAttempt, usingFallback } = useSSE(channel, { pollUrl })
  const meta = STATUS_META[status]

  return (
    <div
      className={cn('flex flex-col gap-0.5 text-xs', className)}
      role="status"
      aria-live="polite"
      data-qa={`sse-status-${channel}`}
    >
      <div className="flex items-center gap-1.5">
        <span className={cn('inline-block h-2 w-2 rounded-full', meta.dot)} aria-hidden="true" />
        {!compact && (
          <span className={cn('font-medium', meta.text)}>
            {meta.label}
            {status === 'reconnecting' && reconnectAttempt > 0 ? ` (#${reconnectAttempt})` : ''}
            {usingFallback ? ' · polling' : ''}
          </span>
        )}
        <span className="sr-only">{`Canal ${channel}: ${meta.label}`}</span>
      </div>
      {lastError && (
        <span className="text-[11px] text-red-500" data-qa={`sse-status-${channel}-error`}>
          {lastError.message} — {formatTimestamp(lastError.at)}
        </span>
      )}
    </div>
  )
}
