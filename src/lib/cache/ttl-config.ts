/**
 * TTL config parametrizado por endpoint lógico.
 * TASK-13 ST002 (CL-043)
 * Consumido por getCachedWithConfig() em cache/index.ts.
 */

export const TTL_CONFIG: Record<string, number> = {
  'reddit.posts': 300,        // 5min
  'reddit.user': 3600,        // 1h
  'reddit.subreddit': 600,    // 10min
  'ga4.report': 600,          // 10min
  'ga4.realtime': 30,         // 30s
  'analytics.funnel': 300,    // 5min
  'analytics.attribution': 300,
  'blog.posts': 120,          // 2min
  'blog.post': 60,
  'health.public': 30,
  'quota.usage': 60,
} as const

const DEFAULT_TTL = 60

/**
 * Resolve TTL para uma chave lógica.
 * Warn em log se chave não mapeada (nunca silencioso).
 */
export function resolveTtl(logicalKey: string): number {
  if (logicalKey in TTL_CONFIG) {
    return TTL_CONFIG[logicalKey]
  }
  console.warn(`[cache/ttl-config] chave "${logicalKey}" sem TTL mapeado — usando default ${DEFAULT_TTL}s`)
  return DEFAULT_TTL
}
