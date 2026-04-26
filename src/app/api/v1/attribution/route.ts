/**
 * GET  /api/v1/attribution?leadId= — First-touch attribution de um lead
 * POST /api/v1/attribution — Registrar conversão e calcular assisted-touch
 * Rastreabilidade: CL-073, INT-073
 *
 * TODO (pós-MVP — CL-136): Implementar modelo de atribuição múltipla (multi-touch)
 * com pesos configuráveis por canal e posição no funil:
 * - Linear: crédito igual entre todos os touchpoints
 * - Time-decay: touchpoints mais recentes recebem mais crédito
 * - U-shaped: primeiro e último touchpoint recebem 40% cada, 20% distribuídos
 * O MVP usa first-touch + assisted-touch sem pesos configuráveis.
 * Ver INTAKE.md seção "Atribuição multi-touch pós-MVP" para modelo completo.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { calculateFirstTouchAttribution, calculateAssistedTouchAttribution } from '@/lib/attribution'
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

    console.info(`[attribution] GET leadId=${parsed.data.leadId} confidence=${firstTouch?.confidence ?? 0}`)
    return ok({ leadId: parsed.data.leadId, firstTouch, fogApplied: firstTouch?.inferred ?? false })
  } catch (err) {
    console.error('[attribution] GET error:', err)
    return internalError()
  }
}

// ─── POST /api/v1/attribution ─────────────────────────────────────────────────

const ConversionSchema = z.object({
  leadId: z.string().uuid(),
  conversionId: z.string().uuid(),
})

/**
 * POST /api/v1/attribution — Calcula créditos first-touch e assisted-touch
 * ao registrar uma conversão. Rastreabilidade: CL-073, TASK-5 ST001
 */
export async function POST(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return ok({ error: 'JSON inválido' }, 400)
  }

  const parsed = ConversionSchema.safeParse(body)
  if (!parsed.success) {
    return ok({ error: 'leadId e conversionId são obrigatórios (uuid)' }, 400)
  }

  const { leadId, conversionId } = parsed.data

  try {
    const [firstTouch, assistedTouches] = await Promise.all([
      calculateFirstTouchAttribution(leadId),
      calculateAssistedTouchAttribution(leadId, conversionId),
    ])

    const fogApplied = firstTouch?.inferred ?? false
    console.info(
      `[attribution] POST leadId=${leadId} conversionId=${conversionId} ` +
      `assistedTouches=${assistedTouches.length} fogApplied=${fogApplied}`
    )

    return ok({
      leadId,
      conversionId,
      firstTouch,
      assistedTouches,
      fogApplied,
    }, 201)
  } catch (err) {
    console.error('[attribution] POST error:', err)
    return internalError()
  }
}
