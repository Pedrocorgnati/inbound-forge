// Intake Review TASK-10 ST001 (CL-258) — cancela uma reuniao Cal.com.
// Chama API do Cal.com (DELETE /v1/bookings/{id}) e atualiza status local.
// `bookingId` e o ID do ConversionEvent local; `externalBookingId` eh o ID no Cal.com.

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, badRequest, notFound, internalError } from '@/lib/api-auth'

interface Params {
  params: Promise<{ id: string; bookingId: string }>
}

async function cancelInCalCom(externalId: string, reason?: string): Promise<void> {
  const key = process.env.CAL_COM_API_KEY
  if (!key) throw new Error('CAL_COM_API_KEY ausente')
  const url = `https://api.cal.com/v1/bookings/${encodeURIComponent(externalId)}/cancel?apiKey=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reason: reason ?? 'Cancelado via Inbound Forge' }),
  })
  if (!res.ok && res.status !== 404) {
    const body = await res.text()
    throw new Error(`Cal.com cancel falhou (${res.status}): ${body.slice(0, 200)}`)
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id: leadId, bookingId } = await params
  if (!leadId || !bookingId) return badRequest('Parametros invalidos')

  try {
    const event = await prisma.conversionEvent.findUnique({
      where: { id: bookingId },
      select: { id: true, leadId: true, type: true, externalBookingId: true, bookingStatus: true },
    })
    if (!event || event.leadId !== leadId || event.type !== 'CALENDAR_BOOKING') {
      return notFound('Booking não encontrado para este lead')
    }
    if (event.bookingStatus === 'canceled') {
      return ok({ alreadyCanceled: true })
    }

    let reason: string | undefined
    try {
      const body = (await request.json()) as { reason?: string }
      reason = body?.reason
    } catch {
      // sem body
    }

    if (event.externalBookingId) {
      await cancelInCalCom(event.externalBookingId, reason)
    }

    const updated = await prisma.conversionEvent.update({
      where: { id: bookingId },
      data: { bookingStatus: 'canceled' },
      select: { id: true, bookingStatus: true },
    })

    return ok(updated)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'erro'
    return internalError(message)
  }
}
