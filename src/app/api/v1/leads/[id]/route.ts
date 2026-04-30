/**
 * GET    /api/v1/leads/[id] — Buscar lead por ID (com ?includeContact=true para descriptografar)
 * PATCH  /api/v1/leads/[id] — Atualizar lead (re-criptografa contactInfo se alterado)
 * DELETE /api/v1/leads/[id] — Deletar lead com auditLog
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { UpdateLeadSchema } from '@/schemas/lead.schema'
import { encryptPII, decryptPII } from '@/lib/crypto'
import { auditLog } from '@/lib/audit'
import { updateThemeConversionScore } from '@/lib/conversion-score'
import { hashContactInfo, parseContactInfo } from '@/lib/leads/contact-hash'

type Params = { params: Promise<{ id: string }> }

// GET /api/v1/leads/[id]
export async function GET(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params
  const includeContact = new URL(request.url).searchParams.get('includeContact') === 'true'

  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        conversionEvents: { orderBy: { occurredAt: 'asc' } },
        firstTouchTheme: { select: { id: true, title: true, conversionScore: true } },
        firstTouchPost: { select: { id: true, channel: true } },
      },
    })
    if (!lead) return notFound('Lead não encontrado')

    let contactInfo = lead.contactInfo ? '●●●●●●' : null
    if (includeContact && lead.contactInfo) {
      contactInfo = decryptPII(lead.contactInfo) // descriptografa (COMP-002)
      // Audit reveal (COMP-001) — SEC-008: não logar o valor
      void auditLog({
        action: 'lead.contact_revealed',
        entityType: 'Lead',
        entityId: id,
        userId: user!.id,
        leadId: id,
        metadata: { channel: lead.channel },
      })
    }

    return ok({ ...lead, contactInfo })
  } catch {
    return internalError()
  }
}

// PATCH /api/v1/leads/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = UpdateLeadSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const existing = await prisma.lead.findUnique({ where: { id } })
    if (!existing) return notFound('Lead não encontrado')

    // Re-criptografar contactInfo e recalcular hash (COMP-002, anti-duplicata)
    let contactInfo: string | null | undefined = undefined
    let contactHash: string | null | undefined = undefined
    if (parsed.data.contactInfo !== undefined) {
      if (parsed.data.contactInfo) {
        contactInfo = encryptPII(parsed.data.contactInfo)
        const parts = parseContactInfo(parsed.data.contactInfo)
        contactHash = hashContactInfo(parts)
        // Verificar se o novo hash colide com outro lead (exceto o próprio)
        const duplicate = await prisma.lead.findUnique({ where: { contactHash }, select: { id: true } })
        if (duplicate && duplicate.id !== id) {
          return NextResponse.json({ error: 'DUPLICATE', existingLeadId: duplicate.id }, { status: 409 })
        }
      } else {
        contactInfo = null
        contactHash = null
      }
    }

    const statusChanged =
      parsed.data.status !== undefined && parsed.data.status !== existing.status

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(contactInfo !== undefined ? { contactInfo, contactHash } : {}),
        ...(statusChanged ? { statusUpdatedAt: new Date() } : {}),
      },
    })

    // Audit log (COMP-001) — sem contactInfo (SEC-008)
    await auditLog({
      action: 'lead.updated',
      entityType: 'Lead',
      entityId: id,
      userId: user!.id,
      leadId: id,
      metadata: {
        changedFields: Object.keys(parsed.data).filter((k) => k !== 'contactInfo'),
      },
    })

    return ok({ ...updated, contactInfo: updated.contactInfo ? '●●●●●●' : null })
  } catch {
    return internalError()
  }
}

// DELETE /api/v1/leads/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const existing = await prisma.lead.findUnique({ where: { id } })
    if (!existing) return notFound('Lead não encontrado')

    await prisma.lead.delete({ where: { id } })

    await auditLog({
      action: 'lead.deleted',
      entityType: 'Lead',
      entityId: id,
      userId: user!.id,
      metadata: { channel: existing.channel, funnelStage: existing.funnelStage },
    })

    // CX-01: Recalcular conversionScore do tema após deleção do lead
    if (existing.firstTouchThemeId) {
      await updateThemeConversionScore(existing.firstTouchThemeId)
    }

    return ok({ success: true })
  } catch {
    return internalError()
  }
}
