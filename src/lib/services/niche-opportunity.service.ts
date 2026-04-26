// NicheOpportunityService — Inbound Forge
// Módulo: module-7-theme-scoring-engine (TASK-2/ST003)
// Gerencia NicheOpportunity por tema. isGeoReady=true aciona geoMultiplier=1.2.

import { prisma } from '@/lib/prisma'
import { ThemeScoringService } from './theme-scoring.service'

export interface NicheOpportunityData {
  isGeoReady: boolean
  description?: string
}

export class NicheOpportunityService {
  private scoringService = new ThemeScoringService()

  /**
   * Busca a NicheOpportunity vinculada a um tema.
   * Retorna null se não existir.
   */
  async getByThemeId(themeId: string) {
    const theme = await prisma.theme.findUnique({
      where: { id: themeId },
      select: { nicheOpportunityId: true },
    })

    if (!theme?.nicheOpportunityId) return null

    return prisma.nicheOpportunity.findUnique({
      where: { id: theme.nicheOpportunityId },
    })
  }

  /**
   * Cria ou atualiza a NicheOpportunity do tema (upsert idempotente).
   * Após atualização: dispara re-score automático do tema.
   */
  async upsertForTheme(themeId: string, data: NicheOpportunityData) {
    const theme = await prisma.theme.findUnique({
      where: { id: themeId },
      select: { id: true, nicheOpportunityId: true },
    })

    if (!theme) {
      const err = new Error('Tema não encontrado.')
      ;(err as Error & { code: string }).code = 'THEME_080'
      throw err
    }

    let nicheOpp

    if (theme.nicheOpportunityId) {
      // Atualizar existente
      nicheOpp = await prisma.nicheOpportunity.update({
        where: { id: theme.nicheOpportunityId },
        data: {
          isGeoReady: data.isGeoReady,
          ...(data.description !== undefined && { painCategory: data.description }),
        },
      })
    } else {
      // Criar nova e vincular ao tema
      nicheOpp = await prisma.nicheOpportunity.create({
        data: {
          sector: 'general',
          painCategory: data.description ?? 'Oportunidade de nicho',
          potentialScore: 0,
          isGeoReady: data.isGeoReady,
        },
      })

      await prisma.theme.update({
        where: { id: themeId },
        data: { nicheOpportunityId: nicheOpp.id },
      })
    }

    // Re-score automático após mudança no GEO flag (INT-104)
    try {
      await this.scoringService.calculateScore(themeId)
    } catch {
      // Falha no re-score não bloqueia o upsert
    }

    return nicheOpp
  }
}

export const nicheOpportunityService = new NicheOpportunityService()
