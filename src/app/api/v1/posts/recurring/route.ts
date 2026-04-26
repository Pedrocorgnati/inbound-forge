// POST /api/v1/posts/recurring — cria posts recorrentes (TASK-14 ST001 / CL-119)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession, validationError, internalError, notFound } from '@/lib/api-auth'
import { createRecurringPosts, expandRRule } from '@/lib/services/recurring-schedule.service'

const Schema = z.object({
  baseDraftId: z.string().min(1),
  rrule: z.string().min(4),
  startAt: z.string().datetime(),
  until: z.string().datetime(),
  maxOccurrences: z.number().int().min(1).max(200).optional(),
  previewOnly: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  const body = await request.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const input = {
      baseDraftId: parsed.data.baseDraftId,
      rrule: parsed.data.rrule,
      startAt: new Date(parsed.data.startAt),
      until: new Date(parsed.data.until),
      maxOccurrences: parsed.data.maxOccurrences,
    }

    if (parsed.data.previewOnly) {
      const expansion = expandRRule(input)
      return NextResponse.json({
        success: true,
        occurrences: expansion.occurrences.slice(0, 10).map((d) => d.toISOString()),
        total: expansion.occurrences.length,
      })
    }

    const result = await createRecurringPosts(input, user!.id)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    if (err instanceof Error && err.message === 'base_draft_not_found') {
      return notFound('Draft base nao encontrado')
    }
    return internalError()
  }
}
