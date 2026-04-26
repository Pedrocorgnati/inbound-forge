/**
 * GET /api/v1/posts/check-slot — Intake-Review TASK-1 ST005 (CL-080)
 * Verifica se um slot (canal + horario) esta disponivel para agendamento.
 * Chamado antes de PATCH em drag-and-drop do calendario.
 *
 * Query:
 *   channel=INSTAGRAM|LINKEDIN|BLOG
 *   scheduledAt=ISO-8601
 *   ignorePostId? (opcional — o proprio post sendo movido)
 *
 * Resposta: { ok: boolean, reason?: string, message?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession, validationError } from '@/lib/api-auth'
import { checkSlot, type SlotChannel } from '@/lib/publishing/slotValidator'

const CHANNELS: readonly SlotChannel[] = ['INSTAGRAM', 'LINKEDIN', 'BLOG']

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const url = new URL(request.url)
  const channel = url.searchParams.get('channel') as SlotChannel | null
  const scheduledAtRaw = url.searchParams.get('scheduledAt')
  const ignorePostId = url.searchParams.get('ignorePostId') ?? undefined

  if (!channel || !CHANNELS.includes(channel)) {
    return validationError(new Error('channel obrigatorio (INSTAGRAM|LINKEDIN|BLOG)'))
  }
  if (!scheduledAtRaw) {
    return validationError(new Error('scheduledAt obrigatorio (ISO-8601)'))
  }

  const scheduledAt = new Date(scheduledAtRaw)
  if (Number.isNaN(scheduledAt.getTime())) {
    return validationError(new Error('scheduledAt invalido'))
  }

  const result = await checkSlot({ channel, scheduledAt, ignorePostId })
  return NextResponse.json(result)
}
