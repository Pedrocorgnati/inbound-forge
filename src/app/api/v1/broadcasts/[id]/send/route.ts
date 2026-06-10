// Inbound F1 — dispara o envio de um broadcast (protegido): enfileira recipients
// (CONFIRMED) e marca SENDING. O cron broadcast-sender drena o envio em lotes.
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { enqueueBroadcast } from '@/lib/email/broadcast-sender'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response || !user) return response ?? internalError()

  const { id } = await params
  const broadcast = await prisma.broadcast.findUnique({ where: { id } })
  if (!broadcast) return notFound('Broadcast nao encontrado')

  if (!['DRAFT', 'SCHEDULED'].includes(broadcast.status)) {
    return ok({ id, status: broadcast.status, queued: 0, note: 'Broadcast ja iniciado.' })
  }

  const { queued } = await enqueueBroadcast(id)
  return ok({ id, status: 'SENDING', queued })
}
