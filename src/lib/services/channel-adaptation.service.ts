/**
 * ChannelAdaptationService — Inbound Forge
 * Módulo: module-8-content-generation (TASK-4/ST001)
 *
 * Adapta conteúdo para canal específico via Claude haiku.
 * Inclui timeout de 15s, auto-truncação e logging de uso.
 */
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { Channel } from '@prisma/client'
import { buildChannelAdaptationPrompt } from '@/lib/prompts/channel-adaptation.prompt'
import { ContentBusinessRuleError } from '@/lib/errors/content-errors'
import { CLAUDE_MODELS, CLAUDE_TIMEOUTS, CHANNEL_CHAR_LIMITS } from '@/lib/constants/content.constants'
import type { AdaptContentInput } from '@/lib/dtos/content-piece.dto'
import type { ChannelAdaptationResult } from '@/lib/types/content-generation.types'
import { captureException } from '@/lib/sentry'
import * as Sentry from '@sentry/nextjs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export class ChannelAdaptationService {
  /**
   * Adapta um ângulo para o canal alvo via Claude haiku.
   * Retorna body adaptado (com truncação automática se necessário).
   */
  static async adapt(
    angleId: string,
    options: AdaptContentInput
  ): Promise<ChannelAdaptationResult & { updatedAngle: object }> {
    const { targetChannel, funnelStage, ctaDestination, ctaCustomText } = options

    // Fetch current angle
    const angle = await prisma.contentAngleVariant.findUnique({
      where: { id: angleId },
      select: {
        id: true,
        text: true,
        editedBody: true,
        pieceId: true,
      },
    })

    if (!angle) {
      throw new ContentBusinessRuleError('CONTENT_090', 'Ângulo não encontrado')
    }

    // Use editedBody if available, otherwise original text
    const currentBody = angle.editedBody ?? angle.text

    // Build prompt
    const prompt = buildChannelAdaptationPrompt(
      currentBody,
      targetChannel,
      funnelStage,
      ctaDestination,
      ctaCustomText
    )

    // Call Claude haiku with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), CLAUDE_TIMEOUTS.CHANNEL_ADAPTATION_MS)

    let claudeResponse
    const t0 = performance.now()
    try {
      claudeResponse = await anthropic.messages.create(
        {
          model: CLAUDE_MODELS.CHANNEL_ADAPTATION,
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        },
        { signal: controller.signal as AbortSignal }
      )
      const durationMs = Math.round(performance.now() - t0)
      Sentry.addBreadcrumb({
        category: 'claude.channel-adapt',
        message: 'channel-adapt',
        level: 'info',
        data: {
          model: CLAUDE_MODELS.CHANNEL_ADAPTATION,
          duration_ms: durationMs,
          angle_id: angleId,
          target_channel: targetChannel,
          success: true,
        },
      })
    } catch (error) {
      clearTimeout(timeout)
      const durationMs = Math.round(performance.now() - t0)
      Sentry.addBreadcrumb({
        category: 'claude.channel-adapt',
        message: 'channel-adapt',
        level: 'error',
        data: {
          model: CLAUDE_MODELS.CHANNEL_ADAPTATION,
          duration_ms: durationMs,
          angle_id: angleId,
          target_channel: targetChannel,
          success: false,
          error_class: error instanceof Error ? (error.constructor?.name ?? 'Error') : 'Unknown',
        },
      })
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('abort'))) {
        throw new ContentBusinessRuleError('CONTENT_071', 'Serviço de adaptação temporariamente indisponível (timeout)')
      }
      throw new ContentBusinessRuleError('CONTENT_052', 'Serviço Claude retornou erro — tente novamente em instantes')
    }
    clearTimeout(timeout)
    const claudeDurationMs = Math.round(performance.now() - t0)

    // Parse response
    const rawText = claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : ''
    let adaptedBody: string
    let hashtags: string[] = []
    let truncated = false

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON object found')
      const parsed = JSON.parse(jsonMatch[0])
      adaptedBody = parsed.adaptedBody ?? ''
      hashtags = parsed.hashtags ?? []
    } catch {
      captureException(new Error('[ChannelAdaptation] Parse error'), { raw: rawText.substring(0, 200) })
      throw new ContentBusinessRuleError('CONTENT_053', 'Resposta da IA em formato inválido — tente novamente')
    }

    // Auto-truncation if body exceeds channel limit
    const limit = CHANNEL_CHAR_LIMITS[targetChannel as Channel]
    if (limit !== Infinity && adaptedBody.length > limit) {
      // Truncate at word boundary
      adaptedBody = adaptedBody.substring(0, limit).replace(/\s\S+$/, '')
      truncated = true
    }

    const charCount = adaptedBody.length

    // Update angle with adapted body
    const updatedAngle = await prisma.contentAngleVariant.update({
      where: { id: angleId },
      data: { editedBody: adaptedBody, charCount },
    })

    // Log API usage
    const inputTokens = claudeResponse.usage.input_tokens
    const outputTokens = claudeResponse.usage.output_tokens
    await Promise.all([
      prisma.apiUsageLog.create({
        data: { service: 'anthropic', metric: 'input_tokens', value: inputTokens, cost: inputTokens * 0.00000025, durationMs: claudeDurationMs },
      }),
      prisma.apiUsageLog.create({
        data: { service: 'anthropic', metric: 'output_tokens', value: outputTokens, cost: outputTokens * 0.00000125, durationMs: claudeDurationMs },
      }),
    ])

    return { adaptedBody, charCount, hashtags, truncated, updatedAngle }
  }
}
