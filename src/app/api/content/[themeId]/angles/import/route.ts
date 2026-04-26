/**
 * POST /api/content/[themeId]/angles/import
 *
 * Importa ângulos gerados externamente (Claude.ai web, CLI, manual).
 * Cria ContentPiece se não existir e grava ContentAngleVariant records.
 * Não chama a Claude API — zero custo de API.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok } from '@/lib/api-auth'
import { ContentAngle, Channel, FunnelStage } from '@/types/enums'
import { THEME_STATUS } from '@/constants/status'
import { buildContentError } from '@/lib/errors/content-errors'
import { logAudit } from '@/lib/audit/log'

// ─── Validation ──────────────────────────────────────────────────────────────

const ImportAngleSchema = z.object({
  angle: z.enum(['AGGRESSIVE', 'CONSULTIVE', 'AUTHORIAL']),
  body: z.string().min(10, 'body deve ter no mínimo 10 caracteres'),
  ctaText: z.string().optional().default(''),
  hashtags: z.array(z.string()).optional().default([]),
})

const ImportAnglesDto = z.object({
  angles: z
    .array(ImportAngleSchema)
    .min(1, 'Envie ao menos 1 ângulo')
    .max(3, 'Máximo de 3 ângulos'),
  source: z
    .enum(['claude-web', 'claude-cli', 'manual'])
    .default('manual'),
  funnelStage: z.nativeEnum(FunnelStage).optional(),
  targetChannel: z.nativeEnum(Channel).optional(),
})

const ANGLE_MAP: Record<string, ContentAngle> = {
  AGGRESSIVE: ContentAngle.AGGRESSIVE,
  CONSULTIVE: ContentAngle.CONSULTIVE,
  AUTHORIAL: ContentAngle.AUTHORIAL,
}

// ─── Route Handler ───────────────────────────────────────────────────────────

interface Params {
  params: Promise<{ themeId: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const { themeId } = await params

  const body = await request.json().catch(() => ({}))
  const parsed = ImportAnglesDto.safeParse(body)
  if (!parsed.success) {
    return buildContentError('CONTENT_002', 422, { details: parsed.error.flatten() })
  }

  const { angles, source, funnelStage, targetChannel } = parsed.data

  // Validate theme exists and is active
  const theme = await prisma.theme.findUnique({
    where: { id: themeId },
    select: { id: true, title: true, status: true },
  })

  if (!theme) {
    return buildContentError('CONTENT_002', 404)
  }

  if (theme.status !== THEME_STATUS.ACTIVE) {
    return buildContentError('CONTENT_050', 422)
  }

  const effectiveFunnelStage = funnelStage ?? FunnelStage.AWARENESS
  const effectiveChannel = targetChannel ?? Channel.LINKEDIN

  // Find or create ContentPiece
  let piece = await prisma.contentPiece.findFirst({
    where: { themeId },
    include: { angles: { orderBy: { generationVersion: 'desc' } } },
  })

  if (!piece) {
    piece = await prisma.contentPiece.create({
      data: {
        themeId,
        baseTitle: theme.title,
        painCategory: 'Geral',
        targetNiche: 'PMEs Brasileiras',
        relatedService: 'Software sob medida',
        funnelStage: effectiveFunnelStage,
        idealFormat: 'post',
        recommendedChannel: effectiveChannel,
        ctaDestination: 'WHATSAPP',
      },
      include: { angles: true },
    })
  }

  // Calculate next generation version
  const existingVersions = piece.angles.map((a) => a.generationVersion)
  const nextVersion =
    existingVersions.length > 0 ? Math.max(...existingVersions) + 1 : 1

  // Create ContentAngleVariant records
  for (const generated of angles) {
    const angleName = ANGLE_MAP[generated.angle]
    if (!angleName) continue

    await prisma.contentAngleVariant.create({
      data: {
        pieceId: piece.id,
        angle: angleName,
        text: generated.body,
        charCount: generated.body.length,
        hashtags: generated.hashtags,
        ctaText: generated.ctaText,
        recommendedCTA: generated.ctaText || '',
        suggestedChannel: effectiveChannel,
        isSelected: false,
        generationVersion: nextVersion,
      },
    })
  }

  await logAudit({
    action: 'content.import',
    entityType: 'ContentPiece',
    entityId: piece.id,
    operatorId: user!.id,
    metadata: { themeId, source, anglesCount: angles.length },
  })

  // Return updated ContentPiece
  const updated = await prisma.contentPiece.findUniqueOrThrow({
    where: { id: piece.id },
    include: {
      angles: {
        where: { generationVersion: nextVersion },
        orderBy: { angle: 'asc' },
      },
    },
  })

  return ok(updated)
}
