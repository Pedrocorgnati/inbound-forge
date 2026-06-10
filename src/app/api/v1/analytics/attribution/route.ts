// CL-178 (TASK-11 ST002/ST003) — Multi-touch attribution API
// GET /api/v1/analytics/attribution?model=FIRST_TOUCH|LAST_TOUCH|LINEAR&period=7d|30d|90d

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, badRequest, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

const QuerySchema = z.object({
  model: z.enum(['FIRST_TOUCH', 'LAST_TOUCH', 'LINEAR']).default('FIRST_TOUCH'),
  period: z.enum(['7d', '30d', '90d']).default('30d'),
})

function periodToDate(period: string): Date {
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    model: searchParams.get('model') ?? undefined,
    period: searchParams.get('period') ?? undefined,
  })
  if (!parsed.success) return badRequest('Parâmetros inválidos')

  const { model, period } = parsed.data
  const since = periodToDate(period)

  try {
    // Buscar conversoes no periodo com touchpoints (UTMLinks) associados via Lead
    const conversions = await prisma.conversionEvent.findMany({
      where: { occurredAt: { gte: since } },
      include: {
        lead: {
          select: {
            firstTouchPostId: true,
            firstTouchThemeId: true,
            channel: true,
          },
        },
      },
      take: 500,
    })

    // Buscar UTMLinks para os posts de first-touch dos leads
    const postIds = conversions
      .map((c) => c.lead?.firstTouchPostId)
      .filter((id): id is string => !!id)

    const utmLinks = await prisma.uTMLink.findMany({
      where: { postId: { in: postIds } },
      select: { postId: true, source: true, medium: true, campaign: true },
    })
    const utmByPost = new Map(utmLinks.map((u) => [u.postId, u]))

    // Para modelos LINEAR e LAST_TOUCH: buscar todos os posts do tema antes da conversao
    type TouchGroup = {
      conversions: number
      totalWeight: number
    }
    const aggregated = new Map<string, TouchGroup>()

    for (const conv of conversions) {
      const lead = conv.lead
      if (!lead) continue

      if (model === 'FIRST_TOUCH') {
        const utm = lead.firstTouchPostId ? utmByPost.get(lead.firstTouchPostId) : null
        const source = utm?.source ?? lead.channel?.toLowerCase() ?? 'direct'
        const key = `${source}||${utm?.medium ?? ''}||${utm?.campaign ?? ''}`
        const existing = aggregated.get(key) ?? { conversions: 0, totalWeight: 0 }
        aggregated.set(key, { conversions: existing.conversions + 1, totalWeight: existing.totalWeight + 1 })
      } else {
        // LAST_TOUCH and LINEAR: fetch posts in theme before conversion
        const posts = await prisma.post.findMany({
          where: {
            contentPiece: { themeId: lead.firstTouchThemeId },
            publishedAt: { not: null, lt: conv.occurredAt },
            utmLink: { isNot: null },
          },
          include: { utmLink: true },
          orderBy: { publishedAt: 'asc' },
          take: 20,
        })

        if (posts.length === 0) {
          // fallback to channel
          const source = lead.channel?.toLowerCase() ?? 'direct'
          const key = `${source}||||`
          const existing = aggregated.get(key) ?? { conversions: 0, totalWeight: 0 }
          aggregated.set(key, { conversions: existing.conversions + 1, totalWeight: existing.totalWeight + 1 })
          continue
        }

        const n = posts.length
        posts.forEach((p, i) => {
          const weight = model === 'LAST_TOUCH' ? (i === n - 1 ? 1 : 0) : 1 / n
          if (weight === 0) return
          const utm = p.utmLink!
          const key = `${utm.source}||${utm.medium ?? ''}||${utm.campaign ?? ''}`
          const existing = aggregated.get(key) ?? { conversions: 0, totalWeight: 0 }
          aggregated.set(key, {
            conversions: existing.conversions + weight,
            totalWeight: existing.totalWeight + weight,
          })
        })
      }
    }

    const totalWeight = Array.from(aggregated.values()).reduce((s, v) => s + v.totalWeight, 0)

    const entries = Array.from(aggregated.entries())
      .map(([key, val]) => {
        const [source, medium, campaign] = key.split('||')
        return {
          source,
          medium: medium || null,
          campaign: campaign || null,
          conversions: Math.round(val.conversions),
          weight: totalWeight > 0 ? val.totalWeight / totalWeight : 0,
        }
      })
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 20)

    return ok({ model, period, entries })
  } catch {
    return internalError()
  }
}
