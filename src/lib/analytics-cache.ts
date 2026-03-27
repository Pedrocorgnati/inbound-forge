// Analytics Cache — module-14
// Cache genérico Redis para queries de analytics
// INT-027, INT-040

import { redis } from '@/lib/redis'

/**
 * Busca valor em cache Redis; se ausente, executa fetcher e armazena.
 * Falha silenciosa — se Redis estiver indisponível, executa fetcher diretamente.
 * SYS_001: Redis indisponível → fallback para query direta
 */
export async function getCachedAnalytics<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get<T>(key)
    if (cached !== null && cached !== undefined) {
      return cached
    }
  } catch (err) {
    // SYS_001 — Redis indisponível, fallback para query direta
    console.error('[SYS_001] analytics-cache: Redis unavailable, falling back to direct query:', err instanceof Error ? err.message : 'unknown')
  }

  const data = await fetcher()

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data))
  } catch {
    // Cache write failure não bloqueia a resposta
  }

  return data
}

/**
 * Invalida chaves de cache de analytics para um usuário específico.
 */
export async function invalidateAnalyticsCache(userId: string): Promise<void> {
  try {
    const keys = await redis.keys(`analytics:*:*:${userId}`)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch {
    // Fire-and-forget
  }
}
