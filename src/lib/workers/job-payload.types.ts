/**
 * Intake-Review TASK-5 (CL-307): tipo base dos payloads de job que contem
 * `idempotencyKey`. Consumers devem chamar `acquireIdempotency(key)` antes de
 * processar para garantir que retries de mesma logica nao duplicam side effects.
 */
import crypto from 'crypto'
import { redis } from '@/lib/redis'

export interface BaseJobPayload {
  /** chave unica por operacao logica — reuse entre retries */
  idempotencyKey: string
  /** ISO 8601 de quando o produtor enfileirou */
  enqueuedAt: string
}

export interface ImageJobPayload extends BaseJobPayload {
  imageJobId: string
  postId?: string
}

export interface ScrapingJobPayload extends BaseJobPayload {
  leadSourceId: string
}

export interface VideoJobPayload extends BaseJobPayload {
  videoJobId: string
}

export interface PublishingJobPayload extends BaseJobPayload {
  postId: string
  channel: 'instagram' | 'linkedin' | 'blog'
}

/**
 * Gera uma idempotencyKey deterministica a partir dos campos que definem a
 * operacao. Use quando um job pode ser re-enfileirado (ex: cron que roda
 * varias vezes na mesma janela) e voce nao quer refazer trabalho.
 */
export function deriveIdempotencyKey(scope: string, parts: Record<string, string | number>): string {
  const canonical = Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('|')
  return `${scope}:${crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 16)}`
}

/**
 * Tenta adquirir a chave no Redis. Retorna true na primeira execucao,
 * false se ja foi processada. TTL de 24h evita acumulo infinito.
 */
export async function acquireIdempotency(
  idempotencyKey: string,
  ttlSeconds = 86400,
): Promise<boolean> {
  const key = `job:processed:${idempotencyKey}`
  const result = await redis.set(key, '1', { nx: true, ex: ttlSeconds })
  return result === 'OK'
}

/**
 * Valida que o payload carrega uma idempotencyKey. Use no entry point do
 * consumer antes de qualquer efeito colateral.
 */
export function assertIdempotent(payload: BaseJobPayload | unknown): asserts payload is BaseJobPayload {
  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof (payload as BaseJobPayload).idempotencyKey !== 'string' ||
    !(payload as BaseJobPayload).idempotencyKey
  ) {
    throw new Error('Job payload missing idempotencyKey (Intake-Review TASK-5 / CL-307)')
  }
}
