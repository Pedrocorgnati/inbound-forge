/**
 * POST /api/content/[themeId]/adapt
 * Módulo: module-8-content-generation (TASK-4/ST003+ST005)
 *
 * Adapta ângulo para canal específico via Claude haiku com rate limit.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { AdaptContentDto } from '@/lib/dtos/content-piece.dto'
import { ChannelAdaptationService } from '@/lib/services/channel-adaptation.service'
import { checkRateLimit } from '@/lib/utils/redis-rate-limiter'
import { CONTENT_RATE_LIMITS } from '@/lib/constants/content.constants'
import {
  buildContentError,
  ContentBusinessRuleError,
  ContentNotFoundError,
  ContentOwnershipError,
} from '@/lib/errors/content-errors'

interface Params {
  params: Promise<{ themeId: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const { themeId } = await params

  // Validate body
  const body = await request.json().catch(() => ({}))
  const parsed = AdaptContentDto.safeParse(body)
  if (!parsed.success) {
    return buildContentError('CONTENT_072', 422, { details: parsed.error.flatten() })
  }

  const { angleId } = parsed.data

  // Find ContentPiece for this theme (ownership check)
  const piece = await prisma.contentPiece.findFirst({
    where: { themeId },
    select: { id: true },
  })

  if (!piece) {
    return buildContentError('CONTENT_080', 404)
  }

  // Rate limit check (5 adaptations/day per operator)
  const rateLimit = await checkRateLimit(
    user!.id,
    'adapt',
    CONTENT_RATE_LIMITS.ADAPTATIONS_PER_DAY
  )

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'CONTENT_070', message: 'Limite diário de adaptações atingido — tente novamente amanhã' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'Retry-After': String(rateLimit.retryAfter ?? ''),
        },
      }
    )
  }

  try {
    const result = await ChannelAdaptationService.adapt(angleId, parsed.data)

    const response = ok(result)
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining - 1))

    return response
  } catch (error) {
    if (error instanceof ContentOwnershipError) {
      return buildContentError('CONTENT_001', 403)
    }
    if (error instanceof ContentNotFoundError) {
      return buildContentError('CONTENT_090', 404)
    }
    if (error instanceof ContentBusinessRuleError) {
      const statusMap: Record<string, number> = {
        CONTENT_071: 503,
        CONTENT_072: 422,
        CONTENT_053: 422,
        CONTENT_052: 502,
        DB_002: 500,
      }
      return buildContentError(
        error.code as Parameters<typeof buildContentError>[0],
        statusMap[error.code] ?? 422
      )
    }
    console.error('[POST /api/content/adapt]', error)
    return buildContentError('DB_002', 500)
  }
}
