/**
 * Seed de Temas — Inbound Forge (Dev)
 * Atualizado: 2026-04-07 — Temas focados em software sob medida / SystemForge
 * Módulo: module-7-theme-scoring-engine (TASK-0/ST004)
 *
 * 5 temas complementares aos do dev.ts (para uso standalone pelo módulo 7).
 * Idempotente via findFirst + create.
 */
import type { PrismaClient } from '@prisma/client'

const DEV_THEMES = [
  {
    title: 'Como reduzir o ciclo de vendas com CRM personalizado (case distribuidora)',
    opportunityScore: 85,
    conversionScore: 85,
    painRelevanceScore: 90,
    caseStrengthScore: 80,
    geoMultiplier: 1.0,
    recencyBonus: 1.0,
    status: 'ACTIVE' as const,
  },
  {
    title: 'Por que escritórios de advocacia estão automatizando petições (e você deveria também)',
    opportunityScore: 78,
    conversionScore: 78,
    painRelevanceScore: 82,
    caseStrengthScore: 75,
    geoMultiplier: 1.0,
    recencyBonus: 1.0,
    status: 'ACTIVE' as const,
  },
  {
    title: 'O custo invisível de ter 5+ ferramentas SaaS que não se integram',
    opportunityScore: 72,
    conversionScore: 72,
    painRelevanceScore: 78,
    caseStrengthScore: 65,
    geoMultiplier: 1.0,
    recencyBonus: 0.5,
    status: 'ACTIVE' as const,
  },
  {
    title: 'Case: como uma rede de academias recuperou 30% dos alunos com sistema de engajamento',
    opportunityScore: 90,
    conversionScore: 90,
    painRelevanceScore: 85,
    caseStrengthScore: 95,
    geoMultiplier: 1.2,
    recencyBonus: 1.0,
    status: 'ACTIVE' as const,
  },
  {
    title: 'Objeção "é muito caro": como calcular o ROI real de software personalizado',
    opportunityScore: 82,
    conversionScore: 82,
    painRelevanceScore: 80,
    caseStrengthScore: 78,
    geoMultiplier: 1.0,
    recencyBonus: 1.0,
    status: 'ACTIVE' as const,
  },
]

export async function seedThemes(prisma: PrismaClient) {
  console.log('🎯 [DEV] Seeding temas complementares — contexto SystemForge...')

  for (const themeData of DEV_THEMES) {
    await prisma.theme.upsert({
      where: { id: themeData.title },
      update: themeData,
      create: themeData,
    }).catch(async () => {
      const existing = await prisma.theme.findFirst({ where: { title: themeData.title } })
      if (!existing) {
        await prisma.theme.create({ data: themeData })
      }
    })
  }

  const count = await prisma.theme.count()
  console.log(`  ✓ Themes: ${count} registros`)
}
