/**
 * Quota por subreddit — anti-DoS granular.
 * TASK-13 ST001 (CL-038)
 * 60 req/hora por subreddit. Failopen se Redis indisponível.
 */
import { redis } from '@/lib/redis'

const LIMIT_PER_HOUR = 60
const WINDOW_SECONDS = 3600

export class SubredditQuotaExceeded extends Error {
  constructor(public readonly subreddit: string, public readonly current: number) {
    super(`Quota subreddit r/${subreddit} excedida (${current}/${LIMIT_PER_HOUR} req/h)`)
    this.name = 'SubredditQuotaExceeded'
  }
}

/**
 * Verifica e incrementa quota do subreddit.
 * Lança SubredditQuotaExceeded se limite atingido.
 */
export async function checkSubredditQuota(subreddit: string): Promise<void> {
  const key = `reddit:quota:${subreddit.toLowerCase()}`

  try {
    const current = await redis.incr(key)

    if (current === 1) {
      // Primeira chamada na janela: define TTL
      await redis.expire(key, WINDOW_SECONDS)
    }

    if (current > LIMIT_PER_HOUR) {
      throw new SubredditQuotaExceeded(subreddit, current)
    }
  } catch (err) {
    if (err instanceof SubredditQuotaExceeded) throw err
    // Redis indisponível: failopen (não bloqueia scraping)
  }
}

/** Retorna uso atual sem incrementar (para monitoring). */
export async function getSubredditQuotaUsage(subreddit: string): Promise<number> {
  const key = `reddit:quota:${subreddit.toLowerCase()}`
  try {
    const val = await redis.get<number>(key)
    return val ?? 0
  } catch {
    return 0
  }
}
