/**
 * TAREFA-018: Broker SSE in-process + helper `createSSEStream`.
 *
 * Modelo de execucao (Fluid Compute, instancia unica): mantem um registro
 * in-process de assinantes por (canal, operatorId). Produtores chamam
 * `publish(channel, operatorId, event)` e o evento e empurrado para os streams
 * abertos daquele operador. Cada stream tambem emite:
 *   - um comentario `: open` na abertura (destrava o EventSource do cliente),
 *   - eventos `initial` (snapshot opcional fornecido pelo route),
 *   - heartbeats periodicos (comentario `: hb`) para manter a conexao viva,
 *   - resultados de `onTick()` quando o route precisa derivar eventos por tick.
 *
 * Isolamento multi-tenant: o registro e indexado por `${channel}:${operatorId}`,
 * logo um `publish` para o operador A nunca alcanca o stream do operador B.
 *
 * Limitacao conhecida (Zero Assumido): sendo in-process, o broker so entrega
 * pushes originados na MESMA instancia. Sob multiplas instancias e necessario um
 * bus externo (Redis pub/sub); o contrato de `publish` foi desenhado para ser
 * reimplementado sobre Redis sem mudar os route handlers.
 */
import type { EventForChannel, SSEChannel } from './events'

/** Intervalo de heartbeat. Casa com os 25s documentados em /api/v1/jobs/[jobId]. */
const HEARTBEAT_MS = 25_000

/** Cadencia padrao de `onTick` (derivacao por tick). 2s = fallback de polling. */
const DEFAULT_TICK_MS = 2_000

type Listener = (event: unknown) => void

/** Registro in-process: `${channel}:${operatorId}` -> conjunto de listeners. */
const subscribers = new Map<string, Set<Listener>>()

function subKey(channel: string, operatorId: string): string {
  return `${channel}:${operatorId}`
}

/**
 * Empurra um evento para todos os streams abertos de (canal, operatorId) nesta
 * instancia. No-op silencioso quando nao ha assinantes. Falha de um listener
 * isolado nunca derruba os demais.
 */
export function publish<C extends SSEChannel>(
  channel: C,
  operatorId: string,
  event: EventForChannel<C>,
): void {
  const set = subscribers.get(subKey(channel, operatorId))
  if (!set || set.size === 0) return
  for (const listener of set) {
    try {
      listener(event)
    } catch {
      // Listener individual nao deve afetar os outros assinantes.
    }
  }
}

export interface CreateSSEStreamOptions<C extends SSEChannel> {
  channel: C
  operatorId: string
  /** AbortSignal da request; encerra o stream quando o cliente desconecta. */
  signal: AbortSignal
  /** Snapshot inicial opcional emitido imediatamente apos abrir. */
  initial?: ReadonlyArray<EventForChannel<C>>
  /** Derivacao por tick; eventos retornados sao emitidos a cada `tickMs`. */
  onTick?: () => EventForChannel<C>[] | Promise<EventForChannel<C>[]>
  /** Cadencia do onTick (ms). Default 2000. */
  tickMs?: number
}

/**
 * Cria uma `Response` de stream SSE (text/event-stream) ligada ao broker.
 *
 * O stream vive ate o `signal` abortar (desconexao do cliente) ou o
 * `ReadableStream` ser cancelado; em ambos os casos os timers sao limpos e o
 * listener e desinscrito (sem leak de assinantes).
 */
export function createSSEStream<C extends SSEChannel>(
  options: CreateSSEStreamOptions<C>,
): Response {
  const { channel, operatorId, signal, initial, onTick } = options
  const tickMs = options.tickMs ?? DEFAULT_TICK_MS
  const encoder = new TextEncoder()
  const key = subKey(channel, operatorId)

  let heartbeatTimer: ReturnType<typeof setInterval> | undefined
  let tickTimer: ReturnType<typeof setInterval> | undefined
  let listener: Listener | undefined
  let tickRunning = false
  let closed = false

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sendEvent = (event: unknown) => {
        if (closed) return
        controller.enqueue(
          encoder.encode(`event: ${channel}\ndata: ${JSON.stringify(event)}\n\n`),
        )
      }
      const sendComment = (text: string) => {
        if (closed) return
        controller.enqueue(encoder.encode(`: ${text}\n\n`))
      }

      const cleanup = () => {
        if (closed) return
        closed = true
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        if (tickTimer) clearInterval(tickTimer)
        const set = subscribers.get(key)
        if (set && listener) {
          set.delete(listener)
          if (set.size === 0) subscribers.delete(key)
        }
        signal.removeEventListener('abort', cleanup)
        try {
          controller.close()
        } catch {
          // controller ja pode estar fechado; ignorar.
        }
      }

      // Cliente ja desconectado antes de comecar.
      if (signal.aborted) {
        cleanup()
        return
      }
      signal.addEventListener('abort', cleanup)

      // Abertura + snapshot inicial.
      sendComment('open')
      if (initial) {
        for (const event of initial) sendEvent(event)
      }

      // Push ao vivo via broker.
      listener = (event) => sendEvent(event)
      let set = subscribers.get(key)
      if (!set) {
        set = new Set<Listener>()
        subscribers.set(key, set)
      }
      set.add(listener)

      // Heartbeat para manter a conexao viva atraves de proxies.
      heartbeatTimer = setInterval(() => sendComment('hb'), HEARTBEAT_MS)

      // Derivacao por tick (overlap-guarded).
      if (onTick) {
        tickTimer = setInterval(() => {
          if (closed || tickRunning) return
          tickRunning = true
          Promise.resolve()
            .then(onTick)
            .then((events) => {
              for (const event of events) sendEvent(event)
            })
            .catch(() => {
              // Falha de um tick nao derruba o stream (Zero Silencio: o cliente
              // continua recebendo heartbeats e pushes ao vivo).
            })
            .finally(() => {
              tickRunning = false
            })
        }, tickMs)
      }
    },
    cancel() {
      closed = true
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      if (tickTimer) clearInterval(tickTimer)
      const set = subscribers.get(key)
      if (set && listener) {
        set.delete(listener)
        if (set.size === 0) subscribers.delete(key)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Desativa buffering em proxies (nginx) para entrega imediata.
      'X-Accel-Buffering': 'no',
    },
  })
}
