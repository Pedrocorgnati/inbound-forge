/**
 * src/lib/cache-manager.ts
 * Rastreabilidade: INT-091, TASK-4/ST003
 * Gerenciamento centralizado de cache Redis com TTL
 *
 * Padrão stale-while-revalidate: busca dados do cache, se não existe
 * chama fetcher() e armazena no Redis com o TTL configurado.
 */
import { redis } from '@/lib/redis'

/**
 * TTLs centralizados (segundos)
 * Todos os caches do sistema devem usar estas constantes.
 */
export const CACHE_TTL = {
  ANALYTICS: 300,       // 5min — métricas de analytics
  HEALTH: 30,           // 30s  — health checks
  COSTS: 300,           // 5min — custos de API
  THEME: 60,            // 1min — temas e scores
  RECONCILIATION: 60,   // 1min — stats de reconciliação
  WORKER_STATUS: 30,    // 30s  — status dos workers
  SESSION: 3600,        // 1h   — sessões
  RATE_LIMIT: 900,      // 15min — janela de rate limiting (SEC-005)
} as const

export type CacheTTL = typeof CACHE_TTL[keyof typeof CACHE_TTL]

/**
 * Busca valor do cache ou executa fetcher() e armazena resultado.
 *
 * @param key   Chave Redis
 * @param ttl   TTL em segundos (usar CACHE_TTL.*)
 * @param fetcher Função que busca o dado quando cache miss
 * @returns Dado do cache ou fetcher()
 *
 * @example
 * const funnel = await getCached(
 *   REDIS_KEYS.ANALYTICS_FUNNEL,
 *   CACHE_TTL.ANALYTICS,
 *   () => db.query(...)
 * )
 */
export async function getCached<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get<T>(key)
    if (cached !== null && cached !== undefined) {
      return cached
    }
  } catch {
    // Se Redis falhar: prosseguir sem cache (graceful degradation)
  }

  const fresh = await fetcher()

  try {
    await redis.set(key, fresh, { ex: ttl })
  } catch {
    // Se Redis falhar ao escrever: retornar dado fresco sem cache
  }

  return fresh
}

/**
 * Invalida uma chave específica do cache
 */
export async function invalidate(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch {
    // Silencioso — falha de invalidação não é crítica
  }
}

/**
 * Invalida todas as chaves que correspondem ao padrão (usa SCAN + DEL)
 * Usar com cuidado em produção — pode ser lento se houver muitas chaves.
 *
 * @param pattern Padrão glob ex: "cache:analytics:*"
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length === 0) return 0

    const pipeline = redis.pipeline()
    for (const key of keys) {
      pipeline.del(key)
    }
    await pipeline.exec()
    return keys.length
  } catch {
    return 0
  }
}

/**
 * Atualiza valor no cache sem TTL (sobrescreve mantendo TTL existente não é possível
 * com Upstash, então este método reaplica o TTL fornecido)
 */
export async function setCached<T>(key: string, value: T, ttl: number): Promise<void> {
  try {
    await redis.set(key, value, { ex: ttl })
  } catch {
    // Silencioso
  }
}
