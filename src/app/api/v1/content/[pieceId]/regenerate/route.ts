// TASK-15 ST002 (CL-067): POST cria nova ContentAngleVariant ignorando
// texto anterior — prompt "from scratch" distinto de /adapt.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'
import {
  REGENERATION_SYSTEM_PROMPT,
  buildRegenerationUserPrompt,
} from '@/lib/prompts/content-regeneration'

const RegenerateSchema = z.object({
  angle: z.enum([
    'QUICK_WIN',
    'STORY',
    'STEP_BY_STEP',
    'EMOTIONAL',
    'TECHNICAL',
    'CASE_STUDY',
    'HOW_TO',
  ] as const).optional(),
  note: z.string().max(500).optional(),
})

type Params = { params: Promise<{ pieceId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { pieceId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }
  const parsed = RegenerateSchema.safeParse(body ?? {})
  if (!parsed.success) return validationError(parsed.error)

  try {
    const piece = await prisma.contentPiece.findUnique({ where: { id: pieceId } })
    if (!piece) return notFound('Peça não encontrada')

    const last = await prisma.contentAngleVariant.findFirst({
      where: { pieceId },
      orderBy: { generationVersion: 'desc' },
    })
    const nextVersion = (last?.generationVersion ?? 0) + 1

    const priorSummary = (last?.editedBody ?? last?.text ?? '').slice(0, 600)
    const userPrompt = buildRegenerationUserPrompt({
      title: piece.baseTitle,
      targetNiche: piece.targetNiche,
      painCategory: piece.painCategory,
      priorSummary,
    })

    // Placeholder da chamada LLM — integracao real e injetada por job downstream.
    // Aqui cria-se apenas o slot da nova variante (worker preenche `text`).
    const angle = (parsed.data.angle ?? last?.angle ?? 'STORY') as import('@prisma/client').ContentAngle
    const variant = await prisma.contentAngleVariant.create({
      data: {
        pieceId,
        angle,
        text: `# Regenerando v${nextVersion}...\n\nAguardando geração (job assíncrono).`,
        recommendedCTA: last?.recommendedCTA ?? 'Saiba mais',
        suggestedChannel: last?.suggestedChannel ?? 'LINKEDIN',
        generationVersion: nextVersion,
      },
    })

    if (user?.id) {
      await auditLog({
        action: 'regenerate_content_from_scratch',
        entityType: 'ContentPiece',
        entityId: pieceId,
        userId: user.id,
        metadata: {
          variantId: variant.id,
          generationVersion: nextVersion,
          angle,
          note: parsed.data.note,
        },
      }).catch(() => undefined)
    }

    return ok({
      variant,
      prompt: { system: REGENERATION_SYSTEM_PROMPT, user: userPrompt },
    }, 201)
  } catch {
    return internalError()
  }
}
