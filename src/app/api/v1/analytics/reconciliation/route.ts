import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

// GET /api/v1/analytics/reconciliation — Retorna contagem de itens não resolvidos por tipo
export async function GET(_request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const [postsWithoutConversion, leadsWithoutPost] = await Promise.all([
      prisma.reconciliationItem.count({
        where: { type: 'click_without_conversion', resolved: false },
      }),
      prisma.reconciliationItem.count({
        where: { type: 'conversion_without_post', resolved: false },
      }),
    ])

    return ok({ postsWithoutConversion, leadsWithoutPost })
  } catch {
    return internalError()
  }
}

// POST /api/v1/analytics/reconciliation — Detecção de órfãos semanal
// INT-106 | ANALYTICS_050: divergências detectadas
export async function POST(_request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  try {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    // 1. Posts com cliques (UTMLink.clicks > 0) mas sem leads associados
    const postsWithClicksNoLeads = await prisma.uTMLink.findMany({
      where: {
        clicks: { gt: 0 },
        post: { publishedAt: { gte: weekAgo } },
      },
      select: {
        postId: true,
        clicks: true,
        post: {
          select: {
            id: true,
            firstTouchLeads: { select: { id: true }, take: 1 },
          },
        },
      },
    })

    let clickOrphans = 0
    for (const link of postsWithClicksNoLeads) {
      if (link.post && link.post.firstTouchLeads.length === 0) {
        // Check if item already exists for this post this week
        const existing = await prisma.reconciliationItem.findFirst({
          where: { type: 'click_without_conversion', postId: link.postId, weekOf: { gte: weekAgo } },
        })
        if (!existing) {
          await prisma.reconciliationItem.create({
            data: {
              type: 'click_without_conversion',
              postId: link.postId,
              weekOf: new Date(),
              resolved: false,
            },
          })
          clickOrphans++
        }
      }
    }

    // 2. Conversões cujo lead não tem UTM tracking associado (post sem UTMLink)
    const conversionsWithoutTracking = await prisma.conversionEvent.findMany({
      where: {
        occurredAt: { gte: weekAgo },
        lead: {
          firstTouchPost: { utmLink: { is: null } },
        },
      },
      select: {
        id: true,
        leadId: true,
      },
    })

    let conversionOrphans = 0
    for (const conv of conversionsWithoutTracking) {
      const existing = await prisma.reconciliationItem.findFirst({
        where: { type: 'conversion_without_post', leadId: conv.leadId, weekOf: { gte: weekAgo } },
      })
      if (!existing) {
        await prisma.reconciliationItem.create({
          data: {
            type: 'conversion_without_post',
            leadId: conv.leadId,
            weekOf: new Date(),
            resolved: false,
          },
        })
        conversionOrphans++
      }
    }

    auditLog({
      action: 'analytics.reconciliation.detect',
      entityType: 'ReconciliationItem',
      entityId: 'weekly-scan',
      userId: user!.id,
      metadata: { clickOrphans, conversionOrphans },
    }).catch(() => {})

    const totalCreated = clickOrphans + conversionOrphans

    if (totalCreated > 0) {
      return ok({
        message: `Reconciliação concluída: ${totalCreated} novos itens detectados.`,
        clickOrphans,
        conversionOrphans,
      }, 207)
    }

    return ok({ message: 'Nenhum novo item detectado.', clickOrphans: 0, conversionOrphans: 0 })
  } catch (err) {
    console.error('[analytics/reconciliation]', err)
    // ANALYTICS_050: falha na detecção de divergências
    return internalError('Erro ao executar reconciliação')
  }
}
