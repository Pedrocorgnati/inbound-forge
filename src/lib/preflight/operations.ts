/**
 * Preflight de IMPACTO para acoes operacionais sensiveis do operador.
 *
 * Diferente do preflight de custo de geracao paga (ver ./quota.ts), aqui o que
 * importa nao e tokens/imagens mas o IMPACTO da acao: downtime, escopo afetado,
 * reversibilidade e (quando ha) custo. Toda acao operacional sensivel deve
 * passar por estimateOperationImpact antes da execucao (Zero Assumido).
 *
 * Consumido pelos endpoints:
 *   POST /api/v1/admin/kill-switch/preflight
 *   POST /api/v1/admin/workers/restart/preflight
 *   POST /api/v1/analytics/ga4/refresh/preflight
 *   POST /api/v1/translate/preflight
 * e pelo componente compartilhado PreflightModal (modo 'operation').
 *
 * Rastreabilidade: loop 05-27-inbound-forge-user-friendly TAREFA-020 (P2).
 * Pre-requisito: estimatePreflight/PreflightEstimate da TAREFA-003.
 */
import { FeatureFlags, type FeatureFlagKey } from '@/lib/feature-flags'
import { getLastRestart, type WorkerId } from '@/lib/services/railway.service'
import { getMonthlyTotalAll, MONTHLY_COST_TARGET_USD } from '@/lib/cost-tracking'

export type OperationKind = 'kill-switch' | 'worker-restart' | 'ga4-refresh' | 'translate'

/** Gravidade declarada da acao, para sinalizacao visual e gating de confirmacao. */
export type ImpactSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * Contrato de saida do preflight operacional, espelhado 1:1 na resposta dos
 * endpoints (campo `data`) e consumido pelo PreflightModal em modo 'operation'.
 */
export interface OperationImpact {
  kind: OperationKind
  severity: ImpactSeverity
  /** Indisponibilidade estimada em ms (0 = sem downtime perceptivel). */
  downtime_ms: number
  /** Custo estimado em USD (0 quando a acao nao incorre custo pago). */
  estimated_cost_usd: number
  /** Orcamento mensal restante em USD (>= 0). */
  quota_remaining: number
  /** Itens de escopo afetados, legiveis (servicos, flags, locales, intervalo). */
  scope: string[]
  /** A acao pode ser revertida depois? */
  reversible: boolean
  /** Exige dupla confirmacao explicita do operador (kill-switch, restart). */
  requires_double_confirm: boolean
  /** Avisos adicionais a exibir antes de confirmar (cooldown, irreversibilidade). */
  warnings: string[]
  /** false quando ha bloqueio (custo > quota, cooldown ativo, flag invalida). */
  can_proceed: boolean
}

export type KillSwitchAction = 'disable' | 'enable'

export interface KillSwitchInput {
  kind: 'kill-switch'
  /** Slug da feature flag (valor de FeatureFlags.*). */
  flag: string
  /** disable = ativar kill-switch (desliga a feature); enable = religar. */
  action: KillSwitchAction
}

export interface WorkerRestartInput {
  kind: 'worker-restart'
  worker: WorkerId
}

export interface Ga4RefreshInput {
  kind: 'ga4-refresh'
  startDate: string
  endDate: string
  metrics?: string[]
}

export interface TranslateInput {
  kind: 'translate'
  articleId: string
  targetLocales: string[]
}

export type OperationInput =
  | KillSwitchInput
  | WorkerRestartInput
  | Ga4RefreshInput
  | TranslateInput

// ---------------------------------------------------------------------------
// Constantes de impacto (env-overridable onde faz sentido)
// ---------------------------------------------------------------------------

/** Flags ALTO risco (kill switches criticos) — ver feature-flags.ts. */
const HIGH_RISK_FLAGS = new Set<FeatureFlagKey>([
  FeatureFlags.AUTH_MIDDLEWARE_V2,
  FeatureFlags.SCRAPING_WORKER_LIVE,
  FeatureFlags.IMAGE_WORKER_LIVE,
  FeatureFlags.INSTAGRAM_PUBLISHING_LIVE,
  FeatureFlags.LEAD_CAPTURE_LIVE,
])

const ALL_FLAG_VALUES = new Set<string>(Object.values(FeatureFlags))

/** Cooldown de restart, espelha RATE_LIMIT_MS de railway.service (2min). */
const WORKER_RESTART_COOLDOWN_MS = 2 * 60 * 1000

/** Downtime estimado de um redeploy de worker (Railway), exposto na UI. */
const WORKER_RESTART_DOWNTIME_MS = Number(
  process.env.WORKER_RESTART_DOWNTIME_MS ?? 90_000,
)

// Pricing Claude em USD por 1M tokens (env-overridable; espelha ./quota.ts).
const CLAUDE_INPUT_USD_PER_MTOK = Number(process.env.CLAUDE_INPUT_USD_PER_MTOK ?? 3)
const CLAUDE_OUTPUT_USD_PER_MTOK = Number(process.env.CLAUDE_OUTPUT_USD_PER_MTOK ?? 15)

// Tokens estimados por artigo traduzido por locale (contexto + saida).
const TRANSLATE_INPUT_TOKENS_PER_LOCALE = 8_000
const TRANSLATE_OUTPUT_TOKENS_PER_LOCALE = 4_000

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000
}

async function quotaRemaining(): Promise<number> {
  const spent = await getMonthlyTotalAll()
  return round4(Math.max(0, MONTHLY_COST_TARGET_USD - spent))
}

function killSwitchImpact(input: KillSwitchInput, quota: number): OperationImpact {
  const flagKnown = ALL_FLAG_VALUES.has(input.flag)
  const highRisk = HIGH_RISK_FLAGS.has(input.flag as FeatureFlagKey)
  const warnings: string[] = []

  if (!flagKnown) {
    warnings.push('flag-unknown')
  }

  // Desligar uma feature ALTO risco = indisponibilidade imediata da feature.
  const disabling = input.action === 'disable'
  const severity: ImpactSeverity = !flagKnown
    ? 'medium'
    : highRisk
      ? 'critical'
      : 'medium'

  // Instagram publishing e kill-switch permanente: religar gera posts irreversiveis.
  const isInstagram = input.flag === FeatureFlags.INSTAGRAM_PUBLISHING_LIVE
  const reversible = !(isInstagram && input.action === 'enable')
  if (isInstagram && input.action === 'enable') {
    warnings.push('instagram-irreversible')
  }
  if (disabling && highRisk) {
    warnings.push('disabling-critical-feature')
  }

  return {
    kind: 'kill-switch',
    severity,
    downtime_ms: 0,
    estimated_cost_usd: 0,
    quota_remaining: quota,
    scope: [input.flag],
    reversible,
    requires_double_confirm: true,
    warnings,
    can_proceed: flagKnown,
  }
}

function workerRestartImpact(
  input: WorkerRestartInput,
  quota: number,
  now: number,
): OperationImpact {
  const last = getLastRestart(input.worker)
  const warnings: string[] = []
  let canProceed = true

  if (last && now - last < WORKER_RESTART_COOLDOWN_MS) {
    canProceed = false
    warnings.push('cooldown-active')
  }

  return {
    kind: 'worker-restart',
    severity: 'high',
    downtime_ms: WORKER_RESTART_DOWNTIME_MS,
    estimated_cost_usd: 0,
    quota_remaining: quota,
    scope: [`worker:${input.worker}`],
    reversible: true,
    requires_double_confirm: true,
    warnings,
    can_proceed: canProceed,
  }
}

function ga4RefreshImpact(input: Ga4RefreshInput, quota: number): OperationImpact {
  const metrics = input.metrics && input.metrics.length > 0 ? input.metrics : ['pageViews', 'sessions']
  return {
    kind: 'ga4-refresh',
    severity: 'low',
    downtime_ms: 0,
    estimated_cost_usd: 0,
    quota_remaining: quota,
    scope: [`${input.startDate} -> ${input.endDate}`, ...metrics.map((m) => `metric:${m}`)],
    reversible: true,
    requires_double_confirm: false,
    warnings: [],
    can_proceed: true,
  }
}

function translateImpact(input: TranslateInput, quota: number): OperationImpact {
  const locales = Array.from(new Set(input.targetLocales))
  const inputTokens = TRANSLATE_INPUT_TOKENS_PER_LOCALE * locales.length
  const outputTokens = TRANSLATE_OUTPUT_TOKENS_PER_LOCALE * locales.length
  const cost = round4(
    (inputTokens / 1_000_000) * CLAUDE_INPUT_USD_PER_MTOK +
      (outputTokens / 1_000_000) * CLAUDE_OUTPUT_USD_PER_MTOK,
  )
  return {
    kind: 'translate',
    severity: 'medium',
    downtime_ms: 0,
    estimated_cost_usd: cost,
    quota_remaining: quota,
    scope: [`article:${input.articleId}`, ...locales.map((l) => `locale:${l}`)],
    reversible: true,
    requires_double_confirm: false,
    warnings: [],
    can_proceed: quota >= cost,
  }
}

/**
 * Estima o impacto de uma acao operacional sensivel. Nunca lanca por input
 * malformado (os endpoints validam via Zod antes); apenas propaga falhas de
 * leitura do custo mensal (DB), tratadas pelo caller.
 */
export async function estimateOperationImpact(
  input: OperationInput,
  now: number = Date.now(),
): Promise<OperationImpact> {
  const quota = await quotaRemaining()

  switch (input.kind) {
    case 'kill-switch':
      return killSwitchImpact(input, quota)
    case 'worker-restart':
      return workerRestartImpact(input, quota, now)
    case 'ga4-refresh':
      return ga4RefreshImpact(input, quota)
    case 'translate':
      return translateImpact(input, quota)
  }
}
