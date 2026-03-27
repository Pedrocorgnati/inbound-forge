/**
 * Seed de Temas — Inbound Forge (Dev)
 * Módulo: module-7-theme-scoring-engine (TASK-0/ST004)
 *
 * Cria 5 temas com status ACTIVE e scores variados para desenvolvimento.
 * Idempotente via upsert por title.
 */
import type { PrismaClient } from '@prisma/client'

const DEV_THEMES = [
  {
    title: 'Como reduzir o ciclo de vendas com automação de follow-up',
    opportunityScore: 85,
    conversionScore: 85,
    painRelevanceScore: 90,
    caseStrengthScore: 80,
    geoMultiplier: 1.0,
    recencyBonus: 1.0,
    status: 'ACTIVE' as const,
  },
  {
    title: 'Prospecção outbound em mercados de nicho: estratégias que funcionam',
    opportunityScore: 72,
    conversionScore: 72,
    painRelevanceScore: 75,
    caseStrengthScore: 68,
    geoMultiplier: 1.0,
    recencyBonus: 1.0,
    status: 'ACTIVE' as const,
  },
  {
    title: 'Por que sua taxa de conversão em proposta está abaixo de 20%',
    opportunityScore: 60,
    conversionScore: 60,
    painRelevanceScore: 65,
    caseStrengthScore: 55,
    geoMultiplier: 1.0,
    recencyBonus: 0.5,
    status: 'ACTIVE' as const,
  },
  {
    title: 'Case: empresa B2B dobrou receita em 6 meses com inbound estruturado',
    opportunityScore: 90,
    conversionScore: 90,
    painRelevanceScore: 85,
    caseStrengthScore: 95,
    geoMultiplier: 1.2,
    recencyBonus: 1.0,
    status: 'ACTIVE' as const,
  },
  {
    title: 'Objeção de preço: como lidar sem dar desconto',
    opportunityScore: 78,
    conversionScore: 78,
    painRelevanceScore: 80,
    caseStrengthScore: 72,
    geoMultiplier: 1.0,
    recencyBonus: 1.0,
    status: 'ACTIVE' as const,
  },
]

export async function seedThemes(prisma: PrismaClient) {
  console.log('🎯 [DEV] Seeding themes...')

  for (const themeData of DEV_THEMES) {
    await prisma.theme.upsert({
      where: { id: themeData.title }, // Workaround: using title as lookup since no unique constraint on title
      update: themeData,
      create: themeData,
    }).catch(async () => {
      // Se upsert por id falha, criar diretamente (seed dev não precisa de strict idempotência)
      const existing = await prisma.theme.findFirst({ where: { title: themeData.title } })
      if (!existing) {
        await prisma.theme.create({ data: themeData })
      }
    })
  }

  const count = await prisma.theme.count()
  console.log(`  ✓ Themes: ${count} registros`)
}
