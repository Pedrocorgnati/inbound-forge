/**
 * GET /api/v1/attribution/[leadId] — Detalhes completos de atribuição por lead
 * Inclui first-touch, assisted-touch e fog mitigation
 */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { calculateFirstTouchAttribution, calculateAssistedTouchAttribution } from '@/lib/attribution'
import { applyFogMitigation } from '@/lib/attribution-fog'
import type { AttributionDetail } from '@/types/leads'

type Params = { params: Promise<{ leadId: string }> }

// GET /api/v1/attribution/[leadId]
export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { leadId } = await params

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        channel: true,
        firstTouchThemeId: true,
        conversionEvents: { select: { id: true } },
      },
    })
    if (!lead) return notFound('Lead não encontrado')

    let firstTouch = await calculateFirstTouchAttribution(leadId)
    let fogApplied = false

    if (!firstTouch || firstTouch.confidence < 0.5) {
      const fog = await applyFogMitigation(lead)
      if (fog) {
        firstTouch = fog
        fogApplied = true
      }
    }

    // Calcular assisted-touch para cada conversão
    const assistedResults = await Promise.all(
      lead.conversionEvents.map((c) => calculateAssistedTouchAttribution(leadId, c.id))
    )
    const assisted = assistedResults.flat()

    const detail: AttributionDetail = {
      firstTouch,
      assisted,
      fogApplied,
    }

    return ok({ leadId, ...detail })
  } catch {
    return internalError()
  }
}
