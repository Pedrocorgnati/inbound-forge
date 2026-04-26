/**
 * AngleGenerationService — Inbound Forge
 * Módulo: module-8-content-generation (TASK-1/ST002)
 *
 * Gera 3 ângulos de conteúdo via Claude com prompt E-E-A-T.
 * Inclui idempotência (forceRegenerate), ApiUsageLog e error handling robusto.
 */
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { ContentAngle, Channel, FunnelStage } from '@/types/enums'
import { THEME_STATUS } from '@/constants/status'
import { KnowledgeContextService } from './knowledge-context.service'
import { PromptFeedbackService } from './prompt-feedback.service'
import { buildAngleGenerationPrompt, ANGLE_NAME_MAP } from '@/lib/prompts/angle-generation.prompt'
import { ContentBusinessRuleError } from '@/lib/errors/content-errors'
import { CLAUDE_MODELS, CLAUDE_TIMEOUTS } from '@/lib/constants/content.constants'
import type { GenerateAnglesInput } from '@/lib/dtos/content-piece.dto'
import type { GeneratedAngle } from '@/lib/types/content-generation.types'
import { captureException } from '@/lib/sentry'
import { isServiceAvailable, ExternalService } from '@/lib/services/service-health'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export class AngleGenerationService {
  /**
   * Gera 3 ângulos para o tema especificado via Claude.
   * Idempotente: retorna existentes se forceRegenerate=false.
   */
  static async generate(
    themeId: string,
    options: GenerateAnglesInput
  ) {
    const { forceRegenerate = false, funnelStage, targetChannel } = options

    // Find or create ContentPiece for this theme
    let piece = await prisma.contentPiece.findFirst({
      where: { themeId },
      include: { angles: { orderBy: { generationVersion: 'desc' } } },
    })

    // If angles exist and not forcing, return existing
    if (!forceRegenerate && piece && piece.angles.length >= 3) {
      return piece
    }

    // Get theme with context
    const theme = await prisma.theme.findUnique({
      where: { id: themeId },
      select: { id: true, title: true, status: true },
    })

    if (!theme) {
      throw new ContentBusinessRuleError('CONTENT_002', 'Tema não encontrado')
    }

    if (theme.status !== THEME_STATUS.ACTIVE) {
      throw new ContentBusinessRuleError('CONTENT_050', 'Tema inativo. Ative o tema antes de gerar conteúdo.')
    }

    const effectiveFunnelStage = funnelStage ?? (piece?.funnelStage as FunnelStage) ?? FunnelStage.AWARENESS
    const effectiveChannel = targetChannel ?? (piece?.recommendedChannel as Channel) ?? Channel.LINKEDIN

    // Manual mode: create ContentPiece in DRAFT without generating angles via API
    if (process.env.CONTENT_GENERATION_MODE === 'manual') {
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
      return piece
    }

    // Build knowledge context
    const context = await KnowledgeContextService.buildContext(themeId)

    if (!KnowledgeContextService.hasMinimumContent(context)) {
      throw new ContentBusinessRuleError('CONTENT_051', 'Adicione ao menos uma dor ou case de sucesso ao tema antes de gerar ângulos.')
    }

    // Get feedback hints from prior rejections
    let feedbackHints: string[] = []
    try {
      feedbackHints = await PromptFeedbackService.getFeedbackHints(themeId)
    } catch {
      // Non-blocking — feedback analysis failure doesn't break generation
    }

    // TASK-2 ST003: verificar disponibilidade do Claude antes de gerar
    const claudeAvailable = await isServiceAvailable(ExternalService.CLAUDE)
    if (!claudeAvailable) {
      throw new ContentBusinessRuleError('SYS_001', 'Geração temporariamente indisponível — Claude API fora do ar')
    }

    // Build prompt
    const prompt = buildAngleGenerationPrompt(context, effectiveFunnelStage, effectiveChannel, feedbackHints)

    // Call Claude with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), CLAUDE_TIMEOUTS.ANGLE_GENERATION_MS)

    let claudeResponse
    try {
      claudeResponse = await anthropic.messages.create(
        {
          model: CLAUDE_MODELS.ANGLE_GENERATION,
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        },
        { signal: controller.signal as AbortSignal }
      )
    } catch (error) {
      clearTimeout(timeout)
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('abort'))) {
        throw new ContentBusinessRuleError('SYS_001', 'Serviço Claude temporariamente indisponível (timeout)')
      }
      throw new ContentBusinessRuleError('CONTENT_052', 'Serviço Claude retornou erro — tente novamente em instantes')
    }
    clearTimeout(timeout)

    // Parse response
    const rawText = claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : ''
    let generatedAngles: GeneratedAngle[]

    try {
      // Extract JSON array from response (Claude may include backticks)
      const jsonMatch = rawText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('No JSON array found')
      generatedAngles = JSON.parse(jsonMatch[0])

      if (!Array.isArray(generatedAngles) || generatedAngles.length !== 3) {
        throw new Error('Expected exactly 3 angles')
      }
    } catch {
      captureException(new Error('[AngleGeneration] Parse error'), { raw: rawText.substring(0, 200) })
      throw new ContentBusinessRuleError('CONTENT_053', 'Resposta da IA em formato inválido — tente novamente')
    }

    // Create or update ContentPiece
    if (!piece) {
      piece = await prisma.contentPiece.create({
        data: {
          themeId,
          baseTitle: theme.title,
          painCategory: context.pains[0]?.title ?? 'Geral',
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

    // Calculate nextGenerationVersion
    const existingVersions = piece.angles.map(a => a.generationVersion)
    const nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions) + 1 : 1
    const generationVersion = forceRegenerate ? nextVersion : 1

    // Create ContentAngleVariant records
    for (const generated of generatedAngles) {
      const angleName = ANGLE_NAME_MAP[generated.angle]
      if (!angleName) continue

      const charCount = generated.body.length

      await prisma.contentAngleVariant.create({
        data: {
          pieceId: piece.id,
          angle: angleName as ContentAngle,
          text: generated.body,
          charCount,
          hashtags: generated.hashtags ?? [],
          ctaText: generated.ctaText,
          recommendedCTA: generated.ctaText,
          suggestedChannel: effectiveChannel,
          isSelected: false,
          generationVersion,
        },
      })
    }

    // Log API usage
    const inputTokens = claudeResponse.usage.input_tokens
    const outputTokens = claudeResponse.usage.output_tokens
    await Promise.all([
      prisma.apiUsageLog.create({
        data: { service: 'anthropic', metric: 'input_tokens', value: inputTokens, cost: inputTokens * 0.000003 },
      }),
      prisma.apiUsageLog.create({
        data: { service: 'anthropic', metric: 'output_tokens', value: outputTokens, cost: outputTokens * 0.000015 },
      }),
    ])

    // Return updated ContentPiece
    return prisma.contentPiece.findUniqueOrThrow({
      where: { id: piece.id },
      include: {
        angles: {
          where: { generationVersion },
          orderBy: { angle: 'asc' },
        },
      },
    })
  }
}
