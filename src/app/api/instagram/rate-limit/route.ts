/**
 * GET /api/instagram/rate-limit — Status do rate limit Instagram (200 req/h)
 *
 * Usado pelo `RateLimitCounter` (TASK-15 / G-007) para exibir contador
 * visivel de requisicoes consumidas + reset window. Nao incrementa contador
 * (read-only). Para incrementar, ver `checkRateLimits()` em rate-limiter.ts.
 *
 * module-12-calendar-publishing | M11.6 (UI) | G-007
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { getRateLimitStatus } from '@/lib/instagram/rate-limiter'
import { INSTAGRAM_RATE_LIMITS } from '@/lib/constants/publishing'

export interface RateLimitResponse {
  used: number
  limit: number
  remaining: number
  resetsAt: string
  percentageUsed: number
  postsToday: number
  postsLimit: number
}

export async function GET(_request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const { requestsThisHour, postsToday } = await getRateLimitStatus()

    const limit = INSTAGRAM_RATE_LIMITS.requestsPerHour
    const used = Math.min(requestsThisHour, limit)
    const remaining = Math.max(0, limit - used)
    const percentageUsed = Math.min(100, Math.round((used / limit) * 100))

    // Janela e horaria — reset no proximo bucket de 1h.
    const now = Date.now()
    const hourMs = 3_600_000
    const resetsAtMs = (Math.floor(now / hourMs) + 1) * hourMs
    const resetsAt = new Date(resetsAtMs).toISOString()

    const payload: RateLimitResponse = {
      used,
      limit,
      remaining,
      resetsAt,
      percentageUsed,
      postsToday,
      postsLimit: INSTAGRAM_RATE_LIMITS.postsPerDay,
    }

    return ok(payload)
  } catch {
    return internalError('Erro ao consultar rate limit do Instagram')
  }
}
