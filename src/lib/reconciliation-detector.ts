// reconciliation-detector.ts — Detecta itens de reconciliação órfãos
// INT-106, FEAT-tracking-analytics-006
// SEC-008: sem PII nos registros — apenas IDs e tipos

import { prisma } from '@/lib/prisma'

/**
 * Detecta UTMLinks com cliques mas sem Lead associado (pelo postId).
 * Upsert para evitar duplicatas.
 * Retorna o número de novos itens criados.
 */
export async function detectClicksWithoutConversion(): Promise<number> {
  const weekOf = getWeekStart()

  // UTMLinks com clicks > 0
  const utmLinks = await prisma.uTMLink.findMany({
    where: { clicks: { gt: 0 } },
    select: { postId: true },
  })

  // Posts de cada UTMLink que NÃO têm leads associados
  let created = 0
  for (const utmLink of utmLinks) {
    const hasLead = await prisma.lead.count({
      where: { firstTouchPostId: utmLink.postId },
    })

    if (hasLead === 0) {
      // Upsert — evitar duplicata por (type, postId, weekOf)
      const existing = await prisma.reconciliationItem.findFirst({
        where: {
          type: 'click_without_conversion',
          postId: utmLink.postId,
          weekOf,
        },
      })

      if (!existing) {
        await prisma.reconciliationItem.create({
          data: {
            type: 'click_without_conversion',
            postId: utmLink.postId,
            weekOf,
            resolved: false,
          },
        })
        created++
      }
    }
  }

  return created
}

/**
 * Detecta Leads cujo firstTouchPost não tem UTMLink associado.
 * Upsert para evitar duplicatas.
 * Retorna o número de novos itens criados.
 */
export async function detectConversionsWithoutPost(): Promise<number> {
  const weekOf = getWeekStart()

  // Leads cujo post de first touch não tem UTMLink
  const leadsWithoutUtm = await prisma.lead.findMany({
    where: {
      firstTouchPost: {
        utmLink: null,
      },
    },
    select: { id: true },
  })

  let created = 0
  for (const lead of leadsWithoutUtm) {
    const existing = await prisma.reconciliationItem.findFirst({
      where: {
        type: 'conversion_without_post',
        leadId: lead.id,
        weekOf,
      },
    })

    if (!existing) {
      await prisma.reconciliationItem.create({
        data: {
          type: 'conversion_without_post',
          leadId: lead.id,
          weekOf,
          resolved: false,
        },
      })
      created++
    }
  }

  return created
}

function getWeekStart(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}
