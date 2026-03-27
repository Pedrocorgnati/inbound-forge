/**
 * GET /api/v1/attribution?leadId= — First-touch attribution de um lead
 * Aplica fog mitigation se confidence < 0.5
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { calculateFirstTouchAttribution } from '@/lib/attribution'
import { applyFogMitigation } from '@/lib/attribution-fog'

const QuerySchema = z.object({
  leadId: z.string().uuid(),
})

// GET /api/v1/attribution
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({ leadId: searchParams.get('leadId') })
  if (!parsed.success) {
    return ok({ error: 'leadId é obrigatório (uuid)' }, 400)
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: parsed.data.leadId },
      select: { id: true, channel: true, firstTouchThemeId: true },
    })
    if (!lead) return notFound('Lead não encontrado')

    let firstTouch = await calculateFirstTouchAttribution(parsed.data.leadId)

    // Aplicar fog mitigation se confidence baixa
    if (!firstTouch || firstTouch.confidence < 0.5) {
      const fog = await applyFogMitigation(lead)
      if (fog) {
        firstTouch = fog
      }
    }

    return ok({ leadId: parsed.data.leadId, firstTouch, fogApplied: firstTouch?.inferred ?? false })
  } catch {
    return internalError()
  }
}
