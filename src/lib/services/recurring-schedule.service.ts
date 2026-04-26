// Recurring schedule — expansao de RRULE em posts derivados (TASK-14 ST001 / CL-119)
// Implementacao minimalista que cobre os presets mais comuns sem dependencia externa.

import 'server-only'
import { prisma } from '@/lib/prisma'

export type RRulePreset = 'DAILY' | 'WEEKLY' | 'TWICE_WEEK' | 'CUSTOM'

export interface RecurringInput {
  baseDraftId: string
  rrule: string // ex: "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  startAt: Date
  until: Date
  maxOccurrences?: number
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000
const HARD_CAP = 200

export interface RecurringExpansion {
  occurrences: Date[]
  rrule: string
}

const WEEKDAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
}

function parseRRule(rule: string): {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  interval: number
  byday: number[]
} {
  const parts = Object.fromEntries(
    rule
      .split(';')
      .map((s) => s.split('='))
      .filter((p) => p.length === 2),
  )
  const freq = (parts.FREQ?.toUpperCase() as 'DAILY' | 'WEEKLY' | 'MONTHLY') ?? 'WEEKLY'
  const interval = Math.max(1, Number(parts.INTERVAL ?? '1'))
  const byday = (parts.BYDAY ?? '')
    .split(',')
    .map((d: string) => WEEKDAY_MAP[d.trim().toUpperCase()])
    .filter((n: number | undefined): n is number => typeof n === 'number')
  return { freq, interval, byday }
}

export function expandRRule(input: RecurringInput): RecurringExpansion {
  const { freq, interval, byday } = parseRRule(input.rrule)
  const cap = Math.min(input.maxOccurrences ?? HARD_CAP, HARD_CAP)
  const limit = Math.min(input.until.getTime(), input.startAt.getTime() + ONE_YEAR_MS)
  const occurrences: Date[] = []
  let cursor = new Date(input.startAt)

  while (cursor.getTime() <= limit && occurrences.length < cap) {
    if (freq === 'WEEKLY' && byday.length > 0) {
      if (byday.includes(cursor.getDay())) occurrences.push(new Date(cursor))
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
    } else if (freq === 'DAILY') {
      occurrences.push(new Date(cursor))
      cursor = new Date(cursor.getTime() + interval * 24 * 60 * 60 * 1000)
    } else if (freq === 'WEEKLY') {
      occurrences.push(new Date(cursor))
      cursor = new Date(cursor.getTime() + interval * 7 * 24 * 60 * 60 * 1000)
    } else {
      // MONTHLY simplificado
      occurrences.push(new Date(cursor))
      cursor.setMonth(cursor.getMonth() + interval)
    }
  }

  return { occurrences, rrule: input.rrule }
}

export async function createRecurringPosts(
  input: RecurringInput,
  userId: string,
): Promise<{ parentId: string; created: number }> {
  const base = await prisma.post.findUnique({ where: { id: input.baseDraftId } })
  if (!base) throw new Error('base_draft_not_found')

  const expansion = expandRRule(input)

  const created = await prisma.$transaction(async (tx) => {
    const updated = await tx.post.update({
      where: { id: base.id },
      data: { recurrenceRule: input.rrule },
    })

    let count = 0
    for (const at of expansion.occurrences) {
      await tx.post.create({
        data: {
          channel: base.channel,
          caption: base.caption,
          hashtags: base.hashtags,
          cta: base.cta,
          ctaText: base.ctaText,
          ctaUrl: base.ctaUrl,
          imageUrl: base.imageUrl,
          videoUrl: base.videoUrl,
          status: 'DRAFT',
          scheduledAt: at,
          recurrenceParentId: updated.id,
          recurrenceRule: input.rrule,
        },
      })
      count += 1
    }
    return { parentId: updated.id, created: count }
  })

  await prisma.auditLog
    .create({
      data: {
        action: 'POST_RECURRING_CREATED',
        entityType: 'Post',
        entityId: created.parentId,
        userId,
        metadata: { rrule: input.rrule, count: created.created },
      },
    })
    .catch(() => undefined)

  return created
}

export async function cancelRecurring(parentId: string): Promise<number> {
  const result = await prisma.post.deleteMany({
    where: { recurrenceParentId: parentId, status: 'DRAFT' },
  })
  return result.count
}
