/**
 * TASK-8 (CL-202) — Timeline cronologica de eventos do lead.
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
      firstTouchPost: { select: { id: true, caption: true } },
      conversionEvents: { orderBy: { occurredAt: 'desc' } },
    },
  })

  if (!lead) {
    return NextResponse.json({ success: false, error: 'Lead nao encontrado' }, { status: 404 })
  }

  const events: LeadJourneyEvent[] = []

  if (lead.firstTouchAt) {
    events.push({
      id: `post-${lead.firstTouchPostId}`,
      type: 'post-view',
      occurredAt: lead.firstTouchAt.toISOString(),
      postSlug: lead.firstTouchPostId,
      postTitle: lead.firstTouchPost.caption.slice(0, 80),
    })
  }

  for (const ev of lead.conversionEvents) {
    events.push({
      id: ev.id,
      type: 'conversion',
      occurredAt: ev.occurredAt.toISOString(),
      conversionType: ev.type,
      notes: ev.notes ?? undefined,
    })
  }

  events.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))

  return NextResponse.json({ success: true, data: events })
}
