/**
 * POST /api/v1/webhooks/calcom — Intake Review TASK-1 (CL-105, CL-106)
 *
 * Recebe eventos `BOOKING_CREATED` e `BOOKING_CANCELLED` do Cal.com e
 * consolida em ConversionEvent (type=CALENDAR_BOOKING).
 *
 * Seguranca: HMAC-SHA256 do raw body + secret CAL_COM_WEBHOOK_SECRET no header
 * `x-cal-signature-256`. Sem assinatura valida -> 401.
 *
 * Idempotencia: `externalBookingId` e UNIQUE — upsert re-entrante.
 *
 * Associacao do lead: resolvemos por `metadata.leadId` — enviado na URL do
 * event type Cal.com como prefill/metadata. O email do attendee nao e usado
 * porque `Lead.contactInfo` e AES-256 (COMP-002) e nao ha campo email em
 * texto claro. Se metadata.leadId nao casar com um Lead existente,
 * respondemos 200 com `{ reconciled: false }` (retriar via MCP/reconciliation
 * e responsabilidade de outra area).
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateSignature } from '@/lib/calcom/webhook-validator'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AttendeeSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
})

const PayloadSchema = z.object({
  triggerEvent: z.enum([
    'BOOKING_CREATED',
    'BOOKING_CANCELLED',
    'BOOKING_RESCHEDULED',
    'BOOKING_CONFIRMED',
  ]),
  createdAt: z.string().optional(),
  payload: z.object({
    uid: z.string().optional(),
    bookingId: z.union([z.string(), z.number()]).optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    attendees: z.array(AttendeeSchema).optional(),
    metadata: z.record(z.unknown()).optional(),
    status: z.string().optional(),
  }),
})

function resolveBookingId(payload: z.infer<typeof PayloadSchema>['payload']): string | null {
  if (payload.uid) return String(payload.uid)
  if (payload.bookingId != null) return String(payload.bookingId)
  return null
}

async function resolveLeadId(
  metadata: Record<string, unknown> | undefined
): Promise<string | null> {
  const metaLeadId = typeof metadata?.leadId === 'string' ? metadata.leadId : null
  if (!metaLeadId) return null
  const byId = await prisma.lead.findUnique({ where: { id: metaLeadId }, select: { id: true } })
  return byId?.id ?? null
}

export async function POST(request: NextRequest) {
  const secret = process.env.CAL_COM_WEBHOOK_SECRET
  if (!secret) {
    logger.error('calcom.webhook', 'CAL_COM_WEBHOOK_SECRET nao configurado')
    return NextResponse.json({ error: 'webhook-not-configured' }, { status: 503 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-cal-signature-256')
  if (!validateSignature(rawBody, signature, secret)) {
    logger.warn('calcom.webhook', 'assinatura HMAC invalida', { signatureProvided: Boolean(signature) })
    return NextResponse.json({ error: 'invalid-signature' }, { status: 401 })
  }

  let json: unknown
  try {
    json = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 })
  }

  const parsed = PayloadSchema.safeParse(json)
  if (!parsed.success) {
    logger.warn('calcom.webhook', 'payload invalido', { issues: parsed.error.issues })
    return NextResponse.json({ error: 'invalid-payload', issues: parsed.error.issues }, { status: 400 })
  }

  const { triggerEvent, payload } = parsed.data
  const externalBookingId = resolveBookingId(payload)
  if (!externalBookingId) {
    return NextResponse.json({ error: 'missing-booking-id' }, { status: 400 })
  }

  const leadId = await resolveLeadId(payload.metadata)
  const occurredAt = payload.startTime ? new Date(payload.startTime) : new Date()
  const utmCampaign =
    typeof payload.metadata?.utm_campaign === 'string' ? (payload.metadata.utm_campaign as string) : null

  try {
    switch (triggerEvent) {
      case 'BOOKING_CREATED':
      case 'BOOKING_CONFIRMED': {
        if (!leadId) {
          logger.warn('calcom.webhook', 'booking sem lead associado', { externalBookingId })
          return NextResponse.json({ ok: true, reconciled: false }, { status: 200 })
        }
        await prisma.conversionEvent.upsert({
          where: { externalBookingId },
          update: {
            bookingStatus: 'scheduled',
            occurredAt,
            utmCampaign: utmCampaign ?? undefined,
          },
          create: {
            leadId,
            type: 'CALENDAR_BOOKING',
            occurredAt,
            externalBookingId,
            bookingStatus: 'scheduled',
            utmCampaign,
            notes: `Cal.com booking ${externalBookingId}`,
          },
        })
        return NextResponse.json({ ok: true, reconciled: true }, { status: 200 })
      }
      case 'BOOKING_CANCELLED': {
        const updated = await prisma.conversionEvent.updateMany({
          where: { externalBookingId },
          data: { bookingStatus: 'canceled' },
        })
        return NextResponse.json({ ok: true, updated: updated.count }, { status: 200 })
      }
      case 'BOOKING_RESCHEDULED': {
        const updated = await prisma.conversionEvent.updateMany({
          where: { externalBookingId },
          data: { bookingStatus: 'scheduled', occurredAt },
        })
        return NextResponse.json({ ok: true, updated: updated.count }, { status: 200 })
      }
    }
  } catch (err) {
    logger.error('calcom.webhook', 'falha ao processar evento', {
      error: err instanceof Error ? err.message : String(err),
      triggerEvent,
      externalBookingId,
    })
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
