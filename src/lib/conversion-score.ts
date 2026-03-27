/**
 * CX-01: Cálculo e atualização de Theme.conversionScore
 * Fórmula: Math.round(conversions_count / leads_count * 100), 0 se leads=0
 * DEVE ser chamado após TODA criação/deleção de ConversionEvent
 */
import { prisma } from '@/lib/prisma'

/**
 * Recalcula e atualiza Theme.conversionScore para um tema.
 * Usa firstTouchThemeId para contar leads e join para contar conversions.
 */
export async function updateThemeConversionScore(themeId: string): Promise<void> {
  const [leadsCount, conversionsCount] = await Promise.all([
    prisma.lead.count({ where: { firstTouchThemeId: themeId } }),
    prisma.conversionEvent.count({
      where: { lead: { firstTouchThemeId: themeId } },
    }),
  ])

  const score = leadsCount > 0 ? Math.round((conversionsCount / leadsCount) * 100) : 0

  await prisma.theme.update({
    where: { id: themeId },
    data: { conversionScore: score },
  })
}
