import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ContentBusinessRuleError } from '@/lib/errors/content-errors'

// ─── Hoisted Mocks ───────────────────────────────────────────────────────────

const { mockPrisma, mockClaudeCreate, mockBuildPrompt } = vi.hoisted(() => {
  const mockPrisma = {
    contentAngleVariant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    apiUsageLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  }
  const mockClaudeCreate = vi.fn()
  const mockBuildPrompt = vi.fn().mockReturnValue('mocked-adaptation-prompt')
  return { mockPrisma, mockClaudeCreate, mockBuildPrompt }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockClaudeCreate }
    },
  }
})

vi.mock('@/lib/prompts/channel-adaptation.prompt', () => ({
  buildChannelAdaptationPrompt: mockBuildPrompt,
}))

vi.mock('@/lib/constants/content.constants', () => ({
  CLAUDE_MODELS: { CHANNEL_ADAPTATION: 'claude-haiku-4-5-20251001' },
  CLAUDE_TIMEOUTS: { CHANNEL_ADAPTATION_MS: 15_000 },
  CHANNEL_CHAR_LIMITS: {
    LINKEDIN: 3000,
    INSTAGRAM: 2200,
    BLOG: Infinity,
  },
}))

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { ChannelAdaptationService } from '../channel-adaptation.service'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ANGLE_ID = 'angle-uuid-001'

function makeAngle(overrides: Record<string, unknown> = {}) {
  return {
    id: ANGLE_ID,
    text: 'Texto original do angulo consultivo com dados concretos.',
    editedBody: null,
    pieceId: 'piece-001',
    ...overrides,
  }
}

function mockClaudeAdaptation(adaptedBody: string, hashtags: string[] = []) {
  mockClaudeCreate.mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ adaptedBody, hashtags }) }],
    usage: { input_tokens: 200, output_tokens: 300 },
  })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ChannelAdaptationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.apiUsageLog.create.mockResolvedValue({})
  })

  describe('adapt() — happy path', () => {
    it('returns adapted body for valid angle + channel', async () => {
      mockPrisma.contentAngleVariant.findUnique.mockResolvedValue(makeAngle())
      const adapted = 'Conteudo adaptado para LinkedIn com CTA.'
      mockClaudeAdaptation(adapted, ['#inbound', '#marketing'])
      mockPrisma.contentAngleVariant.update.mockResolvedValue({ id: ANGLE_ID, editedBody: adapted })

      const result = await ChannelAdaptationService.adapt(ANGLE_ID, {
        targetChannel: 'LINKEDIN' as never,
        funnelStage: 'AWARENESS' as never,
        ctaDestination: 'WHATSAPP' as never,
      })

      expect(result.adaptedBody).toBe(adapted)
      expect(result.hashtags).toEqual(['#inbound', '#marketing'])
      expect(result.truncated).toBe(false)
      expect(result.charCount).toBe(adapted.length)

      // Verify angle was updated
      expect(mockPrisma.contentAngleVariant.update).toHaveBeenCalledWith({
        where: { id: ANGLE_ID },
        data: { editedBody: adapted, charCount: adapted.length },
      })
    })
  })

  describe('adapt() — Instagram truncation', () => {
    it('truncates body exceeding 2200 chars for Instagram', async () => {
      mockPrisma.contentAngleVariant.findUnique.mockResolvedValue(makeAngle())

      // Generate body > 2200 chars
      const longBody = 'Palavra '.repeat(400) // ~3200 chars
      mockClaudeAdaptation(longBody)
      mockPrisma.contentAngleVariant.update.mockResolvedValue({ id: ANGLE_ID })

      const result = await ChannelAdaptationService.adapt(ANGLE_ID, {
        targetChannel: 'INSTAGRAM' as never,
        funnelStage: 'AWARENESS' as never,
        ctaDestination: 'WHATSAPP' as never,
      })

      expect(result.truncated).toBe(true)
      expect(result.charCount).toBeLessThanOrEqual(2200)
    })

    it('does NOT truncate body within Instagram limit', async () => {
      mockPrisma.contentAngleVariant.findUnique.mockResolvedValue(makeAngle())
      const shortBody = 'Post curto para Instagram.'
      mockClaudeAdaptation(shortBody)
      mockPrisma.contentAngleVariant.update.mockResolvedValue({ id: ANGLE_ID })

      const result = await ChannelAdaptationService.adapt(ANGLE_ID, {
        targetChannel: 'INSTAGRAM' as never,
        funnelStage: 'AWARENESS' as never,
        ctaDestination: 'WHATSAPP' as never,
      })

      expect(result.truncated).toBe(false)
      expect(result.adaptedBody).toBe(shortBody)
    })
  })

  describe('adapt() — API usage logging', () => {
    it('creates two ApiUsageLog entries (input + output tokens)', async () => {
      mockPrisma.contentAngleVariant.findUnique.mockResolvedValue(makeAngle())
      mockClaudeAdaptation('Adapted content')
      mockPrisma.contentAngleVariant.update.mockResolvedValue({ id: ANGLE_ID })

      await ChannelAdaptationService.adapt(ANGLE_ID, {
        targetChannel: 'LINKEDIN' as never,
        funnelStage: 'AWARENESS' as never,
        ctaDestination: 'WHATSAPP' as never,
      })

      expect(mockPrisma.apiUsageLog.create).toHaveBeenCalledTimes(2)

      const inputLog = mockPrisma.apiUsageLog.create.mock.calls[0][0]
      expect(inputLog.data.service).toBe('anthropic')
      expect(inputLog.data.metric).toBe('input_tokens')
      expect(inputLog.data.value).toBe(200)

      const outputLog = mockPrisma.apiUsageLog.create.mock.calls[1][0]
      expect(outputLog.data.metric).toBe('output_tokens')
      expect(outputLog.data.value).toBe(300)
    })
  })

  describe('adapt() — error: angle not found', () => {
    it('throws CONTENT_090 when angle does not exist', async () => {
      mockPrisma.contentAngleVariant.findUnique.mockResolvedValue(null)

      await expect(
        ChannelAdaptationService.adapt(ANGLE_ID, {
          targetChannel: 'LINKEDIN' as never,
          funnelStage: 'AWARENESS' as never,
          ctaDestination: 'WHATSAPP' as never,
        })
      ).rejects.toThrow(ContentBusinessRuleError)

      try {
        mockPrisma.contentAngleVariant.findUnique.mockResolvedValue(null)
        await ChannelAdaptationService.adapt(ANGLE_ID, {
          targetChannel: 'LINKEDIN' as never,
          funnelStage: 'AWARENESS' as never,
          ctaDestination: 'WHATSAPP' as never,
        })
      } catch (err) {
        expect((err as ContentBusinessRuleError).code).toBe('CONTENT_090')
      }
    })
  })

  describe('adapt() — error: Claude parse error', () => {
    it('throws CONTENT_053 on invalid Claude response', async () => {
      mockPrisma.contentAngleVariant.findUnique.mockResolvedValue(makeAngle())
      mockClaudeCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'not json at all' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      await expect(
        ChannelAdaptationService.adapt(ANGLE_ID, {
          targetChannel: 'LINKEDIN' as never,
          funnelStage: 'AWARENESS' as never,
          ctaDestination: 'WHATSAPP' as never,
        })
      ).rejects.toThrow(ContentBusinessRuleError)
    })
  })

  describe('adapt() — uses editedBody when available', () => {
    it('prefers editedBody over original text', async () => {
      const edited = 'Corpo editado manualmente pelo operador.'
      mockPrisma.contentAngleVariant.findUnique.mockResolvedValue(makeAngle({ editedBody: edited }))
      mockClaudeAdaptation('Re-adapted from edited')
      mockPrisma.contentAngleVariant.update.mockResolvedValue({ id: ANGLE_ID })

      await ChannelAdaptationService.adapt(ANGLE_ID, {
        targetChannel: 'LINKEDIN' as never,
        funnelStage: 'AWARENESS' as never,
        ctaDestination: 'WHATSAPP' as never,
      })

      // The prompt builder receives the editedBody as first arg, not the original text
      const firstArg = mockBuildPrompt.mock.calls[0][0]
      expect(firstArg).toBe(edited)
    })
  })
})
