/**
 * TASK-8 (CL-202) — Timeline cronologica de eventos do lead.
 * PA-01: form-submit inferred from createdAt; utm-click inferred from firstTouchPost.utmLink.
 * email-open requer infraestrutura de webhook de email — fora do escopo M12.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/api-auth'
import type { LeadJourneyEvent } from '@/lib/types/lead-journey.types'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      firstTouchPost: {
        select: {
          id: true,
          caption: true,
          channel: true,
          utmLink: { select: { source: true, medium: true, campaign: true } },
        },
      },
      conversionEvents: { orderBy: { occurredAt: 'asc' } },
    },
  })

  if (!lead) {
    return NextResponse.json({ success: false, error: 'Lead nao encontrado' }, { status: 404 })
  }

  const events: LeadJourneyEvent[] = []

  // utm-click: inferido do UTMLink do post de first-touch (momento ~ firstTouchAt)
  if (lead.firstTouchAt && lead.firstTouchPost?.utmLink) {
    const utmLink = lead.firstTouchPost.utmLink
    events.push({
      id: `utm-${lead.firstTouchPostId}`,
      type: 'utm-click',
      occurredAt: lead.firstTouchAt.toISOString(),
      utmSource: utmLink.source,
      utmMedium: utmLink.medium,
      utmCampaign: utmLink.campaign,
    })
  }

  // post-view: primeiro contato com o conteudo
  if (lead.firstTouchAt) {
    events.push({
      id: `post-${lead.firstTouchPostId}`,
      type: 'post-view',
      occurredAt: lead.firstTouchAt.toISOString(),
      postSlug: lead.firstTouchPostId,
      postTitle: lead.firstTouchPost.caption.slice(0, 80),
    })
  }

  // form-submit: criacao do lead = preenchimento do formulario
  events.push({
    id: `form-${lead.id}`,
    type: 'form-submit',
    occurredAt: lead.createdAt.toISOString(),
    formName: 'lead-capture',
    source: lead.channel ?? undefined,
  })

  // conversion events
  for (const ev of lead.conversionEvents) {
    events.push({
      id: ev.id,
      type: 'conversion',
      occurredAt: ev.occurredAt.toISOString(),
      conversionType: ev.type,
      notes: ev.notes ?? undefined,
    })
  }

  // Ordem cronológica; tie-break por tipo (utm-click → post-view → form-submit → conversion)
  const TYPE_ORDER: Record<string, number> = {
    'utm-click': 0, 'post-view': 1, 'form-submit': 2, conversion: 3, 'email-open': 4,
  }
  events.sort((a, b) =>
    a.occurredAt !== b.occurredAt
      ? a.occurredAt < b.occurredAt ? -1 : 1
      : (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9)
  )

  return NextResponse.json({ success: true, data: events })
}
