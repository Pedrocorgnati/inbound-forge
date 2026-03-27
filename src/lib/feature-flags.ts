/**
 * feature-flags.ts — Server-side feature flags via PostHog
 *
 * Gerado por: /rollout-strategy-create setup
 * Plataforma: PostHog
 * Sistema: single-user (operador fixo: "operator-pedro")
 *
 * IMPORTANTE: Para sistema single-user, o distinctId é sempre "operator-pedro".
 * Fail-safe: feature desabilitada se PostHog indisponível.
 */

import { PostHog } from 'posthog-node'

// ---------------------------------------------------------------------------
// Cliente PostHog (singleton)
// ---------------------------------------------------------------------------

let _client: PostHog | null = null

function getPostHogClient(): PostHog {
  if (!_client) {
    if (!process.env.POSTHOG_API_KEY) {
      // Em desenvolvimento sem chave configurada, retornar instância mock
      if (process.env.NODE_ENV === 'development') {
        console.warn('[feature-flags] POSTHOG_API_KEY não configurado — todas as flags = false')
      }
    }
    _client = new PostHog(process.env.POSTHOG_API_KEY ?? 'phc_placeholder', {
      host: process.env.POSTHOG_HOST ?? 'https://app.posthog.com',
      // Silenciar erros de rede para não quebrar o app
      fetch: (url, options) =>
        globalThis.fetch(url, options).catch(() => new Response('{}', { status: 200 })),
    })
  }
  return _client
}

// ---------------------------------------------------------------------------
// Constantes de Feature Flags
// Geradas a partir de ROLLOUT-STRATEGY.md (11 flags: 5 ALTO + 6 MÉDIO)
// ---------------------------------------------------------------------------

export const FeatureFlags = {
  // ALTO risco — kill switches críticos
  /** module-3: Auth middleware v2 (SEC-critical, THREAT-001) */
  AUTH_MIDDLEWARE_V2: 'auth-middleware-v2',
  /** module-6: Scraping worker Railway (LGPD COMP-004, rawText TTL) */
  SCRAPING_WORKER_LIVE: 'scraping-worker-live',
  /** module-9: Image worker Railway (Ideogram/Flux, custo real) */
  IMAGE_WORKER_LIVE: 'image-worker-live',
  /** module-12: Instagram publishing — KILL SWITCH PERMANENTE (posts irreversíveis) */
  INSTAGRAM_PUBLISHING_LIVE: 'instagram-publishing-live',
  /** module-13: Lead capture (AES-256 PII, SEC-008, LGPD TTL 2 anos) */
  LEAD_CAPTURE_LIVE: 'lead-capture-live',

  // MÉDIO risco — toggles funcionais
  /** module-7: Theme scoring engine (Claude API + N+1 budget 500ms) */
  THEME_SCORING_ENGINE: 'theme-scoring-engine',
  /** module-8: Content generation (Claude API batch, ContentStatus state machine) */
  CONTENT_GENERATION_LIVE: 'content-generation-live',
  /** module-10: Asset library uploads (Supabase Storage RLS) */
  ASSET_LIBRARY_UPLOADS: 'asset-library-uploads',
  /** module-11: Blog public routes (ISR + JSON-LD + OG Satori, impacto SEO) */
  BLOG_PUBLIC_ROUTES: 'blog-public-routes',
  /** module-14: Analytics dashboard (GA4 consent gate LGPD) */
  ANALYTICS_DASHBOARD: 'analytics-dashboard',
  /** module-15: Onboarding wizard (agrega todos os módulos upstream) */
  ONBOARDING_WIZARD: 'onboarding-wizard',
} as const

export type FeatureFlagKey = (typeof FeatureFlags)[keyof typeof FeatureFlags]

// ---------------------------------------------------------------------------
// ID do operador (single-user system)
// ---------------------------------------------------------------------------

export const OPERATOR_DISTINCT_ID = 'operator-pedro'

// ---------------------------------------------------------------------------
// isFeatureEnabled — avaliação server-side
// ---------------------------------------------------------------------------

/**
 * Avalia uma feature flag para o operador.
 *
 * @param flagKey - Chave da flag (usar FeatureFlags.XXX)
 * @param properties - Propriedades opcionais do operador para segmentação
 * @returns true se habilitada, false se desabilitada ou em caso de erro
 *
 * @example
 * const canPublish = await isFeatureEnabled(FeatureFlags.INSTAGRAM_PUBLISHING_LIVE)
 * if (!canPublish) return NextResponse.json({ error: 'Feature não habilitada' }, { status: 403 })
 */
export async function isFeatureEnabled(
  flagKey: FeatureFlagKey,
  properties?: Record<string, string | boolean | number>
): Promise<boolean> {
  try {
    const client = getPostHogClient()
    const result = await client.isFeatureEnabled(flagKey, OPERATOR_DISTINCT_ID, {
      personProperties: properties as Record<string, string> | undefined,
    })
    return result ?? false
  } catch (error) {
    // Fail-safe: desabilitar feature se PostHog indisponível
    console.error(`[feature-flags] Erro ao avaliar flag "${flagKey}":`, error)
    return false
  }
}

/**
 * Avalia múltiplas flags de uma vez (batch evaluation).
 * Útil para carregar o estado inicial da UI.
 *
 * @param flagKeys - Array de flag keys a avaliar
 * @returns Mapa de flag key → boolean
 *
 * @example
 * const flags = await evaluateFlags([FeatureFlags.AUTH_MIDDLEWARE_V2, FeatureFlags.LEAD_CAPTURE_LIVE])
 */
export async function evaluateFlags(
  flagKeys: FeatureFlagKey[]
): Promise<Record<FeatureFlagKey, boolean>> {
  const results = await Promise.allSettled(
    flagKeys.map(async (key) => ({ key, enabled: await isFeatureEnabled(key) }))
  )

  const flagMap: Partial<Record<FeatureFlagKey, boolean>> = {}
  for (const result of results) {
    if (result.status === 'fulfilled') {
      flagMap[result.value.key] = result.value.enabled
    } else {
      // Fail-safe para flags que falharam individualmente
    }
  }

  return flagMap as Record<FeatureFlagKey, boolean>
}

/**
 * Shutdown gracioso do cliente PostHog.
 * Chamar em processo de encerramento (ex: SIGTERM handler no Railway worker).
 */
export async function shutdownFeatureFlags(): Promise<void> {
  if (_client) {
    await _client.shutdown()
    _client = null
  }
}
