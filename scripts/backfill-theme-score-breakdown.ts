// Backfill script — popula score_breakdown para temas existentes (CL-072 / TASK-5 ST001)
// Uso: pnpm tsx scripts/backfill-theme-score-breakdown.ts [--dry-run]
// Performance budget: < 5s para 1000 temas (chunk de 50)

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const CHUNK = 50
const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  const total = await prisma.theme.count({ where: { scoreBreakdown: { equals: Prisma.DbNull } } })
  console.log(`[backfill] temas pendentes: ${total} ${DRY_RUN ? '(dry-run)' : ''}`)

  let processed = 0
  let cursor: string | undefined

  while (processed < total) {
    const themes = await prisma.theme.findMany({
      where: { scoreBreakdown: { equals: Prisma.DbNull } },
      take: CHUNK,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        conversionScore: true,
        painRelevanceScore: true,
        caseStrengthScore: true,
        geoMultiplier: true,
        recencyBonus: true,
      },
    })

    if (themes.length === 0) break

    const updates = themes.map((t) =>
      prisma.theme.update({
        where: { id: t.id },
        data: {
          scoreBreakdown: {
            painRelevance: t.painRelevanceScore ?? 0,
            caseStrength: t.caseStrengthScore ?? 0,
            geoMultiplier: t.geoMultiplier ?? 1,
            recencyBonus: t.recencyBonus ?? 0,
            conversionMultiplier: 1,
            baseScore: t.conversionScore ?? 0,
            finalScore: t.conversionScore ?? 0,
            computedAt: new Date().toISOString(),
            backfilled: true,
          } as never,
        },
      }),
    )

    if (!DRY_RUN) {
      await prisma.$transaction(updates)
    }

    processed += themes.length
    cursor = themes[themes.length - 1]?.id
    console.log(`[backfill] processados ${processed}/${total}`)
  }

  console.log(`[backfill] OK — ${processed} temas atualizados ${DRY_RUN ? '(dry-run, nada escrito)' : ''}`)
}

main()
  .catch((err) => {
    console.error('[backfill] erro:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
