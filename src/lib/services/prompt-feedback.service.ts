/**
 * PromptFeedbackService — Inbound Forge
 * Módulo: module-8-content-generation (TASK-1/ST005 + TASK-3/ST003)
 * CL-036: Loop de retroalimentação de rejeições → ajuste de prompts
 *
 * Analisa padrões de rejeição de conteúdo para retroalimentar prompts futuros.
 * Implementado como serviço não-bloqueante: falha silenciosa (log apenas).
 */
import { prisma } from '@/lib/prisma'
import type { FeedbackHint } from '@/lib/types/content-generation.types'

async function logPromptAdjustment(themeId: string, patterns: ActionablePattern[]): Promise<void> {
  try {
    await prisma.alertLog.create({
      data: {
        type: 'PROMPT_ADJUSTMENT',
        severity: 'info',
        message: `Ajuste automático de prompt para tema ${themeId}: ${patterns.map(p => `${p.category}(${p.count})`).join(', ')}`,
      },
    })
  } catch {
    // Não-bloqueante
  }
}

// Categorias canônicas de rejeição
export type RejectionCategory =
  | 'TOM_INADEQUADO'
  | 'CONTEUDO_GENERICO'
  | 'CTA_FRACO'
  | 'FORA_DO_CONTEXTO'
  | 'OUTRO'

export interface ActionablePattern {
  category: RejectionCategory
  count: number
  hint: string
}

// Mapeamento de keywords → categoria + hint
const REJECTION_PATTERNS: Array<{
  keywords: string[]
  category: RejectionCategory
  hint: string
}> = [
  {
    keywords: ['agressivo', 'vendedor', 'chamativo', 'forçado', 'forçado demais'],
    category: 'TOM_INADEQUADO',
    hint: 'Suavize o tom — prefira abordagem educativa em vez de vendas diretas',
  },
  {
    keywords: ['longo demais', 'muito longo', 'extenso', 'comprido'],
    category: 'TOM_INADEQUADO',
    hint: 'Reduza o comprimento do conteúdo — seja mais conciso e direto ao ponto',
  },
  {
    keywords: ['genérico', 'vago', 'superficial', 'sem profundidade'],
    category: 'CONTEUDO_GENERICO',
    hint: 'Seja mais específico — use dados concretos e exemplos do setor',
  },
  {
    keywords: ['muito técnico', 'técnico demais', 'complicado', 'difícil'],
    category: 'CONTEUDO_GENERICO',
    hint: 'Use linguagem mais acessível — evite jargões técnicos excessivos',
  },
  {
    keywords: ['sem cta', 'sem chamada', 'sem ação', 'cta fraco'],
    category: 'CTA_FRACO',
    hint: 'Inclua chamada para ação mais clara e direta no final',
  },
  {
    keywords: ['fora do tema', 'não é sobre', 'irrelevante', 'contexto errado'],
    category: 'FORA_DO_CONTEXTO',
    hint: 'Mantenha o foco no tema principal — elimine informações tangenciais',
  },
]

const ACTIONABLE_THRESHOLD = 3 // Número mínimo de rejeições para pattern virar actionable

export class PromptFeedbackService {
  /**
   * Retorna padrões acionáveis (count >= threshold) para um tema.
   * Usado pelo AngleGenerationService antes de gerar conteúdo.
   */
  static async getActionablePatterns(themeId: string): Promise<ActionablePattern[]> {
    const pieces = await prisma.contentPiece.findMany({
      where: { themeId },
      select: { id: true },
    })
    if (pieces.length === 0) return []

    const rejections = await prisma.contentRejection.findMany({
      where: { pieceId: { in: pieces.map(p => p.id) } },
      select: { reason: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
    if (rejections.length === 0) return []

    const reasons = rejections.map(r => r.reason?.toLowerCase() ?? '').filter(Boolean)
    return buildActionablePatterns(reasons)
  }

  /**
   * Analisa rejeições recentes de um tema e retorna hints para o próximo prompt.
   * Não lança exceções — falha silenciosa para não bloquear o fluxo principal.
   */
  static async getFeedbackHints(themeId: string): Promise<string[]> {
    try {
      const patterns = await PromptFeedbackService.getActionablePatterns(themeId)
      if (patterns.length > 0) {
        // ST004: registrar ajuste automático para auditoria (não-bloqueante)
        void logPromptAdjustment(themeId, patterns)
      }
      return patterns.map(p => p.hint)
    } catch {
      return []
    }
  }

  /**
   * Registra uma rejeição e analisa padrões para feedback futuro.
   * Chamado após salvar ContentRejection — não-bloqueante.
   */
  static async recordAndAnalyze(themeId: string): Promise<FeedbackHint[]> {
    const pieces = await prisma.contentPiece.findMany({
      where: { themeId },
      select: { id: true },
    })
    if (pieces.length === 0) return []

    const rejections = await prisma.contentRejection.findMany({
      where: { pieceId: { in: pieces.map(p => p.id) } },
      select: { reason: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const reasons = rejections.map(r => r.reason?.toLowerCase() ?? '').filter(Boolean)
    const patterns = buildActionablePatterns(reasons)

    return patterns.map(p => ({
      pattern: p.category,
      hint: p.hint,
      rejectionCount: p.count,
    }))
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildActionablePatterns(reasons: string[]): ActionablePattern[] {
  const counts = new Map<RejectionCategory, { count: number; hint: string }>()

  for (const pattern of REJECTION_PATTERNS) {
    const matchCount = reasons.filter(r => pattern.keywords.some(kw => r.includes(kw))).length
    if (matchCount === 0) continue

    const existing = counts.get(pattern.category)
    if (!existing || matchCount > existing.count) {
      counts.set(pattern.category, { count: matchCount, hint: pattern.hint })
    } else {
      counts.set(pattern.category, { count: existing.count + matchCount, hint: existing.hint })
    }
  }

  const actionable: ActionablePattern[] = []
  for (const [category, { count, hint }] of counts.entries()) {
    if (count >= ACTIONABLE_THRESHOLD) {
      actionable.push({ category, count, hint })
    }
  }

  return actionable.sort((a, b) => b.count - a.count)
}
