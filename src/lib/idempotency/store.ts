import { redis } from '@/lib/redis'

/**
 * Store de idempotencia backed por Upstash Redis (TAREFA-019).
 *
 * Guarda, por chave de escopo, o fingerprint do request e a resposta
 * cacheada (status + body) para replay seguro dentro da janela de 24h.
 * Usa marcador "pending" atomico (SET NX) para serializar requisicoes
 * concorrentes com a mesma chave e evitar dupla execucao.
 */

// TTL da resposta cacheada (segundos) — janela de idempotencia de 24h.
export const IDEMPOTENCY_RESPONSE_TTL = 86_400

// TTL do marcador in-flight (segundos). Curto para que um handler que morra
// no meio nao bloqueie a chave por 24h; tambem coberto por release() no catch.
export const IDEMPOTENCY_PENDING_TTL = 60

export interface CachedResponse {
  status: number
  body: string
  contentType: string
}

interface PendingRecord {
  phase: 'pending'
  fingerprint: string
  createdAt: string
}

interface DoneRecord {
  phase: 'done'
  fingerprint: string
  response: CachedResponse
  createdAt: string
}

type IdempotencyRecord = PendingRecord | DoneRecord

export type BeginResult =
  | { state: 'started' }
  | { state: 'replay'; response: CachedResponse }
  | { state: 'mismatch' }
  | { state: 'in_flight' }

/** Lancada quando o Redis esta indisponivel — mapeada para 503 pelo middleware. */
export class IdempotencyStoreUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Idempotency store unavailable')
    this.name = 'IdempotencyStoreUnavailableError'
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause
  }
}

/**
 * Tenta iniciar uma operacao idempotente.
 * - 'started'   -> caller deve executar o handler e depois chamar complete().
 * - 'replay'    -> ja existe resposta concluida com mesmo fingerprint.
 * - 'mismatch'  -> chave reutilizada com corpo divergente (replay inseguro).
 * - 'in_flight' -> requisicao concorrente com mesmo corpo ainda em execucao.
 */
export async function begin(key: string, fingerprint: string): Promise<BeginResult> {
  let created: unknown
  try {
    const pending: PendingRecord = {
      phase: 'pending',
      fingerprint,
      createdAt: new Date().toISOString(),
    }
    created = await redis.set(key, pending, { nx: true, ex: IDEMPOTENCY_PENDING_TTL })
  } catch (err) {
    throw new IdempotencyStoreUnavailableError(err)
  }

  if (created === 'OK') {
    return { state: 'started' }
  }

  let existing: IdempotencyRecord | null
  try {
    existing = await redis.get<IdempotencyRecord>(key)
  } catch (err) {
    throw new IdempotencyStoreUnavailableError(err)
  }

  // Registro evaporou entre o SET NX e o GET (expiracao na corrida):
  // tratar como mismatch conservador — nunca re-executa silenciosamente.
  if (!existing) {
    return { state: 'mismatch' }
  }

  if (existing.fingerprint !== fingerprint) {
    return { state: 'mismatch' }
  }

  if (existing.phase === 'done') {
    return { state: 'replay', response: existing.response }
  }

  return { state: 'in_flight' }
}

/** Persiste a resposta concluida, sobrescrevendo o marcador pending. */
export async function complete(
  key: string,
  fingerprint: string,
  response: CachedResponse,
): Promise<void> {
  const done: DoneRecord = {
    phase: 'done',
    fingerprint,
    response,
    createdAt: new Date().toISOString(),
  }
  try {
    await redis.set(key, done, { ex: IDEMPOTENCY_RESPONSE_TTL })
  } catch (err) {
    throw new IdempotencyStoreUnavailableError(err)
  }
}

/** Libera o marcador pending (handler falhou/erro) para permitir nova tentativa. */
export async function release(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch {
    // best-effort: o marcador expira sozinho via IDEMPOTENCY_PENDING_TTL.
  }
}
