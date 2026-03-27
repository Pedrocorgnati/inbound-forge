/**
 * PromptFeedbackService — Inbound Forge
 * Módulo: module-8-content-generation (TASK-1/ST005 + TASK-3/ST003)
 *
 * Analisa padrões de rejeição de conteúdo para retroalimentar prompts futuros.
 * Implementado como serviço não-bloqueante: falha silenciosa (log apenas).
 */
import { prisma } from '@/lib/prisma'
import type { FeedbackHint } from '@/lib/types/content-generation.types'

// Keywords de padrões de rejeição e hints correspondentes
const REJECTION_PATTERNS: Array<{ keywords: string[]; hint: string }> = [
  {
    keywords: ['longo demais', 'muito longo', 'extenso', 'comprido'],
    hint: 'Reduza o comprimento do conteúdo — seja mais conciso e direto ao ponto',
  },
  {
    keywords: ['muito técnico', 'técnico demais', 'complicado', 'difícil'],
    hint: 'Use linguagem mais acessível — evite jargões técnicos excessivos',
  },
  {
    keywords: ['genérico', 'vago', 'superficial', 'sem profundidade'],
    hint: 'Seja mais específico — use dados concretos e exemplos do setor',
  },
  {
    keywords: ['agressivo', 'vendedor', 'chamativo', 'forçado'],
    hint: 'Suavize o tom — prefira abordagem educativa em vez de vendas diretas',
  },
  {
    keywords: ['sem cta', 'sem chamada', 'sem ação'],
    hint: 'Inclua chamada para ação mais clara e direta no final',
  },
]

export class PromptFeedbackService {
  /**
   * Analisa rejeições recentes de um tema e retorna hints para o próximo prompt.
   * Não lança exceções — falha silenciosa para não bloquear o fluxo principal.
   */
  static async getFeedbackHints(themeId: string): Promise<string[]> {
    const pieces = await prisma.contentPiece.findMany({
      where: { themeId },
      select: { id: true },
    })

    if (pieces.length === 0) return []

    const pieceIds = pieces.map(p => p.id)

    const rejections = await prisma.contentRejection.findMany({
      where: { pieceId: { in: pieceIds } },
      select: { reason: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    if (rejections.length < 2) return []

    const reasons = rejections
      .map(r => r.reason?.toLowerCase() ?? '')
      .filter(Boolean)

    const hints: string[] = []

    for (const pattern of REJECTION_PATTERNS) {
      const matchCount = reasons.filter(reason =>
        pattern.keywords.some(kw => reason.includes(kw))
      ).length

      if (matchCount >= 2) {
        hints.push(pattern.hint)
      }
    }

    return hints
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

    const pieceIds = pieces.map(p => p.id)

    const rejections = await prisma.contentRejection.findMany({
      where: { pieceId: { in: pieceIds } },
      select: { reason: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const reasons = rejections
      .map(r => r.reason?.toLowerCase() ?? '')
      .filter(Boolean)

    const feedbackHints: FeedbackHint[] = []

    for (const pattern of REJECTION_PATTERNS) {
      const matchCount = reasons.filter(reason =>
        pattern.keywords.some(kw => reason.includes(kw))
      ).length

      if (matchCount >= 2) {
        feedbackHints.push({
          pattern: pattern.keywords[0],
          hint: pattern.hint,
          rejectionCount: matchCount,
        })
      }
    }

    return feedbackHints
  }
}
