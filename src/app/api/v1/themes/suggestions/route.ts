/**
 * POST /api/v1/themes/suggestions — Intake Review TASK-10 ST001 (CL-052).
 * Geracao sincrona sob demanda de temas (rate-limit 1/5min por operador).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { redis } from '@/lib/redis'
import { themeGenerationService } from '@/lib/services/theme-generation.service'

const RATE_LIMIT_TTL = 5 * 60 // 5 minutos

export async function POST(_req: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  const key = `themes-gen:${user!.id}`
  // SET NX + EX — retorna null quando ja existe (rate-limitado)
  const locked = await redis.set(key, '1', { nx: true, ex: RATE_LIMIT_TTL })
  if (locked === null) {
    const retryAfter = await redis.ttl(key).catch(() => RATE_LIMIT_TTL)
    return NextResponse.json(
      { success: false, error: 'Aguarde 5 minutos antes de gerar novamente.', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  try {
    const result = await themeGenerationService.generate()
    return ok({
      createdCount: result.created ?? 0,
      updatedCount: result.updated ?? 0,
      skippedCount: result.skipped ?? 0,
      themeIds: (result as unknown as { themeIds?: string[] }).themeIds ?? [],
      mode: (result as unknown as { mode?: string }).mode ?? 'full',
    })
  } catch (err) {
    console.error('[POST /api/v1/themes/suggestions]', err)
    return internalError('Falha ao gerar sugestoes de temas.')
  }
}
