/**
 * GET /api/v1/notifications — Intake Review TASK-11 ST002 (CL-245).
 * Lista ultimas 20 notificacoes + contador de nao-lidas.
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.notification.count({ where: { readAt: null } }),
    ])
    return ok({ notifications, unreadCount })
  } catch (err) {
    console.error('[GET /api/v1/notifications]', err)
    return internalError()
  }
}

/**
 * POST — bulk mark all as read.
 */
export async function POST(_req: NextRequest) {
  const { response } = await requireSession()
  if (response) return response
  try {
    const result = await prisma.notification.updateMany({
      where: { readAt: null },
      data: { readAt: new Date() },
    })
    return ok({ updated: result.count })
  } catch (err) {
    console.error('[POST /api/v1/notifications]', err)
    return internalError()
  }
}
