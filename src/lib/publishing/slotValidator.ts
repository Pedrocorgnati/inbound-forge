/**
 * Slot validator — Intake-Review TASK-1 ST005
 * Valida se um slot de publicacao (canal + horario) esta disponivel
 * considerando (a) ocupacao exata (mesmo canal, mesmo minuto) e
 * (b) limite diario do canal (Instagram: 100 posts / 24h janela rolante).
 *
 * Timezone: os horarios sao persistidos em UTC. O chamador (browser)
 * converte de/para o timezone local do operador antes de enviar.
 */
import { prisma } from '@/lib/prisma'
import { INSTAGRAM_RATE_LIMITS } from '@/lib/constants/publishing'

export type SlotChannel = 'INSTAGRAM' | 'LINKEDIN' | 'BLOG'

export interface SlotCheckInput {
  channel: SlotChannel
  scheduledAt: Date
  /** Id do post sendo movido/editado (ignorado na checagem de conflito). */
  ignorePostId?: string
}

export type SlotCheckReason =
  | 'slot_occupied'
  | 'daily_limit_reached'

export interface SlotCheckResult {
  ok: boolean
  reason?: SlotCheckReason
  message?: string
  conflictingPostId?: string
}

const ACTIVE_STATUSES = ['DRAFT', 'REVIEW', 'APPROVED', 'SCHEDULED', 'PENDING_ART'] as const

export async function checkSlot(input: SlotCheckInput): Promise<SlotCheckResult> {
  const { channel, scheduledAt, ignorePostId } = input

  const occupied = await prisma.post.findFirst({
    where: {
      channel,
      scheduledAt,
      status: { in: [...ACTIVE_STATUSES] },
      ...(ignorePostId ? { NOT: { id: ignorePostId } } : {}),
    },
    select: { id: true },
  })

  if (occupied) {
    return {
      ok: false,
      reason: 'slot_occupied',
      message: 'Ja existe post agendado neste canal e horario',
      conflictingPostId: occupied.id,
    }
  }

  if (channel === 'INSTAGRAM') {
    const windowEnd = new Date(scheduledAt.getTime() + 24 * 60 * 60 * 1000)
    const dailyCount = await prisma.post.count({
      where: {
        channel: 'INSTAGRAM',
        scheduledAt: { gte: scheduledAt, lt: windowEnd },
        status: { in: [...ACTIVE_STATUSES] },
        ...(ignorePostId ? { NOT: { id: ignorePostId } } : {}),
      },
    })

    if (dailyCount >= INSTAGRAM_RATE_LIMITS.postsPerDay) {
      return {
        ok: false,
        reason: 'daily_limit_reached',
        message: `Limite diario do Instagram atingido (${INSTAGRAM_RATE_LIMITS.postsPerDay} posts / 24h)`,
      }
    }
  }

  return { ok: true }
}
