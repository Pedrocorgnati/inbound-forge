/**
 * KnowledgeContextService — Inbound Forge
 * Módulo: module-8-content-generation (TASK-1/ST001)
 *
 * Monta o contexto do knowledge base para o prompt de geração de ângulos.
 * Busca dores, cases e padrões de solução vinculados ao tema.
 */
import { prisma } from '@/lib/prisma'
import type { KnowledgeContext } from '@/lib/types/content-generation.types'

export class KnowledgeContextService {
  /**
   * Constrói o contexto completo do knowledge base para um tema.
   * Retorna pains, cases e patterns vinculados ao tema via relações.
   */
  static async buildContext(themeId: string): Promise<KnowledgeContext> {
    const theme = await prisma.theme.findUnique({
      where: { id: themeId },
      select: {
        id: true,
        title: true,
        pain: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        case: {
          select: {
            id: true,
            name: true,
            outcome: true,
          },
        },
        solutionPattern: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    })

    if (!theme) {
      throw new Error(`Tema ${themeId} não encontrado`)
    }

    const pains = theme.pain
      ? [{ id: theme.pain.id, title: theme.pain.title, description: theme.pain.description }]
      : []

    const cases = theme.case
      ? [
          {
            id: theme.case.id,
            title: theme.case.name,
            result: theme.case.outcome.substring(0, 300), // snippet 300 chars
          },
        ]
      : []

    const patterns = theme.solutionPattern
      ? [
          {
            id: theme.solutionPattern.id,
            title: theme.solutionPattern.name,
            description: theme.solutionPattern.description,
          },
        ]
      : []

    return {
      theme: { id: theme.id, title: theme.title },
      pains,
      cases,
      patterns,
    }
  }

  /**
   * Verifica se o knowledge base tem conteúdo suficiente para geração.
   * Requer ao menos uma dor ou case.
   */
  static hasMinimumContent(context: KnowledgeContext): boolean {
    return context.pains.length > 0 || context.cases.length > 0
  }
}
