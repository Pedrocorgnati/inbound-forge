/**
 * Preflight de custo/quota para geracoes pagas (Claude texto, Ideogram/Flux imagem).
 * Rastreabilidade: loop 05-27-inbound-forge-user-friendly TASK-003 (P0).
 *
 * Toda geracao paga deve passar por estimatePreflight antes da chamada efetiva
 * (Zero Assumido em chamada paga). Consumido pelos endpoints
 * /api/v1/{angles,content,art}/preflight e pelo componente compartilhado PreflightModal.
 *
 * Pre-requisito para TAREFA-020 (preflight em kill-switch/restart/etc) e
 * TAREFA-024 (art studio), que reutilizam estimatePreflight + PreflightEstimate.
 */
import type { TemplateType } from '@/types/image-template'
import type { ImageProvider } from '@/types/image-worker'
import { IMAGE_PROVIDERS, TEMPLATE_PROVIDER_MAP } from '@/lib/constants/image-worker'
import { getMonthlyTotalAll, MONTHLY_COST_TARGET_USD } from '@/lib/cost-tracking'

export type PreflightKind = 'angles' | 'content' | 'art'

/**
 * Contrato de saida do preflight, espelhado 1:1 na resposta dos endpoints
 * /api/v1/{kind}/preflight (campo `data`) e consumido pelo PreflightModal.
 */
export interface PreflightEstimate {
  /** Custo estimado em USD da operacao (round 4 casas). */
  estimated_cost_usd: number
  /** Tokens estimados (input+output). Zero para geracoes de imagem. */
  estimated_tokens: number
  /** Orcamento mensal restante em USD (>= 0). */
  quota_remaining: number
  /** Timeout esperado da operacao em ms. */
  timeout_ms: number
  /** false quando quota_remaining < estimated_cost_usd (bloqueio na UI). */
  can_proceed: boolean
}

export interface PreflightInput {
  kind: PreflightKind
  /** Quantidade de unidades a gerar (angles, pecas ou imagens). Default 1. */
  count?: number
  /** Template de imagem (apenas kind='art'); define o provider e o custo. */
  templateType?: string | null
}

// Pricing Claude em USD por 1M tokens (env-overridable; default classe Sonnet).
const CLAUDE_INPUT_USD_PER_MTOK = Number(process.env.CLAUDE_INPUT_USD_PER_MTOK ?? 3)
const CLAUDE_OUTPUT_USD_PER_MTOK = Number(process.env.CLAUDE_OUTPUT_USD_PER_MTOK ?? 15)

// Tokens estimados por unidade de geracao de texto (heuristica conservadora:
// contexto + saida por angle/peca). Ajustavel sem tocar callers.
const TEXT_TOKENS_PER_UNIT: Record<'angles' | 'content', { input: number; output: number }> = {
  angles: { input: 4_000, output: 2_000 },
  content: { input: 6_000, output: 3_000 },
}

// Timeout esperado por kind (ms). Exposto na UI para Zero Estados Indefinidos.
const TIMEOUT_MS: Record<PreflightKind, number> = {
  angles: 60_000,
  content: 90_000,
  art: 120_000,
}

// Provider default para imagem quando o template nao e conhecido (mais barato).
const DEFAULT_ART_PROVIDER: ImageProvider = 'flux'

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000
}

function estimateTextCost(kind: 'angles' | 'content', count: number): { tokens: number; cost: number } {
  const per = TEXT_TOKENS_PER_UNIT[kind]
  const inputTokens = per.input * count
  const outputTokens = per.output * count
  const cost =
    (inputTokens / 1_000_000) * CLAUDE_INPUT_USD_PER_MTOK +
    (outputTokens / 1_000_000) * CLAUDE_OUTPUT_USD_PER_MTOK
  return { tokens: inputTokens + outputTokens, cost }
}

function resolveArtProvider(templateType?: string | null): ImageProvider {
  if (templateType && templateType in TEMPLATE_PROVIDER_MAP) {
    return TEMPLATE_PROVIDER_MAP[templateType as TemplateType]
  }
  return DEFAULT_ART_PROVIDER
}

/**
 * Estima custo, tokens, quota restante e timeout de uma geracao paga.
 * Nunca lanca por input malformado de count/templateType (normaliza); apenas
 * propaga falhas de leitura do custo mensal (DB), tratadas pelo caller.
 */
export async function estimatePreflight(input: PreflightInput): Promise<PreflightEstimate> {
  const count = Math.max(1, Math.floor(input.count ?? 1))

  let estimated_tokens = 0
  let estimated_cost_usd = 0

  if (input.kind === 'art') {
    const provider = resolveArtProvider(input.templateType)
    estimated_cost_usd = round4(IMAGE_PROVIDERS[provider].costUsd * count)
    estimated_tokens = 0
  } else {
    const { tokens, cost } = estimateTextCost(input.kind, count)
    estimated_tokens = tokens
    estimated_cost_usd = round4(cost)
  }

  const spent = await getMonthlyTotalAll()
  const quota_remaining = round4(Math.max(0, MONTHLY_COST_TARGET_USD - spent))
  const can_proceed = quota_remaining >= estimated_cost_usd

  return {
    estimated_cost_usd,
    estimated_tokens,
    quota_remaining,
    timeout_ms: TIMEOUT_MS[input.kind],
    can_proceed,
  }
}
