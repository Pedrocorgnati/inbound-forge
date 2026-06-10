'use client'

/**
 * TAREFA-018 (ST002, ST004): hook de cliente reutilizavel por canal SSE.
 *
 * Conecta em `/api/sse/{channel}` via EventSource e expoe uma maquina de estado
 * de conexao SEM estados indefinidos: `connecting | open | reconnecting |
 * offline`. Reconexao automatica usa o full jitter canonico (ST001,
 * `fullJitterDelay`). Apos `maxReconnectAttempts` falhas consecutivas o hook
 * degrada para `offline` e — quando `pollUrl` e fornecido — ativa fallback de
 * polling do endpoint REST equivalente (ST002: Fluid Compute indisponivel; ST004:
 * cutover gradual por canal, mantendo o polling antigo como rede de seguranca
 * ate o canal SSE estar verde).
 *
 * O ultimo erro de stream fica exposto em `lastError` com timestamp (Zero
 * Silencio) para ser renderizado por `SSEStatus`.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { fullJitterDelay } from '@/lib/sse/backoff'
import type { SSEChannel, EventForChannel } from '@/lib/sse/events'

export type SSEConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'offline'

export interface SSEStreamError {
  message: string
  at: string
}

export interface UseSSEOptions<C extends SSEChannel> {
  /** Endpoint REST para fallback de polling quando o SSE fica offline (ST002/ST004). */
  pollUrl?: string
  /** Cadencia do polling de fallback (ms). Default 5000. */
  pollIntervalMs?: number
  /** Falhas consecutivas de reconexao antes de degradar para offline. Default 4. */
  maxReconnectAttempts?: number
  /** Extrai o evento do payload do polling REST (default: identidade). */
  mapPollResponse?: (data: unknown) => EventForChannel<C> | null
}

export interface UseSSEResult<C extends SSEChannel> {
  status: SSEConnectionStatus
  lastEvent: EventForChannel<C> | null
  lastError: SSEStreamError | null
  /** Numero da tentativa de reconexao corrente (0 quando conectado). */
  reconnectAttempt: number
  /** True quando operando via fallback de polling REST (SSE indisponivel). */
  usingFallback: boolean
}

const DEFAULT_POLL_INTERVAL_MS = 5_000
const DEFAULT_MAX_RECONNECT = 4

export function useSSE<C extends SSEChannel>(
  channel: C,
  options: UseSSEOptions<C> = {},
): UseSSEResult<C> {
  const {
    pollUrl,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT,
    mapPollResponse,
  } = options

  const [status, setStatus] = useState<SSEConnectionStatus>('connecting')
  const [lastEvent, setLastEvent] = useState<EventForChannel<C> | null>(null)
  const [lastError, setLastError] = useState<SSEStreamError | null>(null)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const [usingFallback, setUsingFallback] = useState(false)

  const sourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attemptRef = useRef(0)
  const disposedRef = useRef(false)

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const startPollingFallback = useCallback(() => {
    if (!pollUrl || disposedRef.current || pollTimerRef.current) return
    setUsingFallback(true)
    const tick = async () => {
      try {
        const res = await fetch(pollUrl, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: unknown = await res.json()
        const mapped = mapPollResponse ? mapPollResponse(data) : (data as EventForChannel<C>)
        if (mapped !== null && mapped !== undefined) setLastEvent(mapped)
        setLastError(null)
      } catch (err) {
        setLastError({
          message: `Fallback de polling falhou: ${err instanceof Error ? err.message : 'erro desconhecido'}`,
          at: new Date().toISOString(),
        })
      }
    }
    void tick()
    pollTimerRef.current = setInterval(() => void tick(), pollIntervalMs)
  }, [pollUrl, pollIntervalMs, mapPollResponse])

  useEffect(() => {
    disposedRef.current = false

    const connect = () => {
      if (disposedRef.current) return
      const source = new EventSource(`/api/sse/${channel}`)
      sourceRef.current = source

      source.onopen = () => {
        if (disposedRef.current) return
        attemptRef.current = 0
        setReconnectAttempt(0)
        setUsingFallback(false)
        setStatus('open')
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
        }
      }

      // O broker emite `event: ${channel}`; ouvir o nome do canal alem do default.
      const onMessage = (ev: MessageEvent<string>) => {
        if (disposedRef.current) return
        try {
          setLastEvent(JSON.parse(ev.data) as EventForChannel<C>)
          setLastError(null)
        } catch {
          setLastError({ message: 'Payload SSE invalido (JSON)', at: new Date().toISOString() })
        }
      }
      source.addEventListener(channel, onMessage as EventListener)
      source.onmessage = onMessage

      source.onerror = () => {
        if (disposedRef.current) return
        source.close()
        sourceRef.current = null
        const attempt = attemptRef.current
        setLastError({
          message: `Conexao SSE interrompida (tentativa ${attempt + 1})`,
          at: new Date().toISOString(),
        })

        if (attempt >= maxReconnectAttempts) {
          setStatus('offline')
          startPollingFallback()
          return
        }

        attemptRef.current = attempt + 1
        setReconnectAttempt(attempt + 1)
        setStatus('reconnecting')
        reconnectTimerRef.current = setTimeout(connect, fullJitterDelay(attempt))
      }
    }

    setStatus('connecting')
    connect()

    return () => {
      disposedRef.current = true
      clearTimers()
      if (sourceRef.current) {
        sourceRef.current.close()
        sourceRef.current = null
      }
    }
  }, [channel, maxReconnectAttempts, clearTimers, startPollingFallback])

  return { status, lastEvent, lastError, reconnectAttempt, usingFallback }
}
