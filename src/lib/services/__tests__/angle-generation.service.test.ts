import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ContentBusinessRuleError } from '@/lib/errors/content-errors'

// ─── Hoisted Mocks (vi.mock factories are hoisted, so variables must be too) ─

const { mockPrisma, mockClaudeCreate, mockBuildContext, mockHasMinimumContent, mockGetFeedbackHints } = vi.hoisted(() => {
  const mockPrisma = {
    contentPiece: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    theme: {
      findUnique: vi.fn(),
    },
    contentAngleVariant: {
      create: vi.fn(),
    },
    apiUsageLog: {
      create: vi.fn(),
    },
  }
  const mockClaudeCreate = vi.fn()
  const mockBuildContext = vi.fn()
  const mockHasMinimumContent = vi.fn()
  const mockGetFeedbackHints = vi.fn().mockResolvedValue([])
  return { mockPrisma, mockClaudeCreate, mockBuildContext, mockHasMinimumContent, mockGetFeedbackHints }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockClaudeCreate }
    },
  }
})

vi.mock('../knowledge-context.service', () => ({
  KnowledgeContextService: {
    buildContext: mockBuildContext,
    hasMinimumContent: mockHasMinimumContent,
  },
}))

vi.mock('../prompt-feedback.service', () => ({
  PromptFeedbackService: {
    getFeedbackHints: mockGetFeedbackHints,
  },
}))

vi.mock('@/lib/prompts/angle-generation.prompt', () => ({
  buildAngleGenerationPrompt: vi.fn().mockReturnValue('mocked-prompt'),
  ANGLE_NAME_MAP: {
    AGGRESSIVE: 'AGGRESSIVE',
    CONSULTIVE: 'CONSULTIVE',
    AUTHORIAL: 'AUTHORIAL',
  },
}))

vi.mock('@/lib/constants/content.constants', () => ({
  CLAUDE_MODELS: { ANGLE_GENERATION: 'claude-sonnet-4-6' },
  CLAUDE_TIMEOUTS: { ANGLE_GENERATION_MS: 30_000 },
}))

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { AngleGenerationService } from '../angle-generation.service'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const THEME_ID = 'theme-uuid-001'

const mockContext = {
  theme: { id: THEME_ID, title: 'Automação de Processos' },
  pains: [{ id: 'p1', title: 'Processos manuais', description: 'Erro humano' }],
  cases: [{ id: 'c1', title: 'Case Alpha', result: 'Redução de 40%' }],
  patterns: [],
}

const claudeAnglesResponse = [
  { angle: 'AGGRESSIVE', body: 'Texto agressivo...', charCount: 120, ctaText: 'Fale agora', ctaDestination: 'WHATSAPP', hashtags: ['#automacao'] },
  { angle: 'CONSULTIVE', body: 'Texto consultivo...', charCount: 140, ctaText: 'Saiba mais', ctaDestination: 'WHATSAPP', hashtags: ['#gestao'] },
  { angle: 'AUTHORIAL', body: 'Texto autoral...', charCount: 130, ctaText: 'Veja o case', ctaDestination: 'WHATSAPP', hashtags: ['#case'] },
]

function mockClaudeSuccess() {
  mockClaudeCreate.mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(claudeAnglesResponse) }],
    usage: { input_tokens: 500, output_tokens: 800 },
  })
}

function mockThemeActive() {
  mockPrisma.theme.findUnique.mockResolvedValue({ id: THEME_ID, title: 'Automação de Processos', status: 'ACTIVE' })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AngleGenerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generate() — happy path', () => {
    it('creates ContentPiece + 3 angles for valid theme', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(null)
      mockThemeActive()
      mockBuildContext.mockResolvedValue(mockContext)
      mockHasMinimumContent.mockReturnValue(true)
      mockClaudeSuccess()

      const createdPiece = {
        id: 'piece-001',
        themeId: THEME_ID,
        baseTitle: 'Automação de Processos',
        angles: [],
      }
      mockPrisma.contentPiece.create.mockResolvedValue(createdPiece)
      mockPrisma.contentAngleVariant.create.mockResolvedValue({})
      mockPrisma.apiUsageLog.create.mockResolvedValue({})

      const finalPiece = { ...createdPiece, angles: claudeAnglesResponse }
      mockPrisma.contentPiece.findUniqueOrThrow.mockResolvedValue(finalPiece)

      const result = await AngleGenerationService.generate(THEME_ID, {})

      expect(mockPrisma.contentPiece.create).toHaveBeenCalledOnce()
      expect(mockPrisma.contentAngleVariant.create).toHaveBeenCalledTimes(3)
      expect(mockPrisma.apiUsageLog.create).toHaveBeenCalledTimes(2)
      expect(result.angles).toHaveLength(3)
    })
  })

  describe('generate() — idempotency', () => {
    it('returns existing piece when forceRegenerate=false and 3 angles exist', async () => {
      const existingPiece = {
        id: 'piece-001',
        themeId: THEME_ID,
        angles: [
          { id: 'a1', generationVersion: 1 },
          { id: 'a2', generationVersion: 1 },
          { id: 'a3', generationVersion: 1 },
        ],
      }
      mockPrisma.contentPiece.findFirst.mockResolvedValue(existingPiece)

      const result = await AngleGenerationService.generate(THEME_ID, { forceRegenerate: false })

      expect(result).toEqual(existingPiece)
      expect(mockClaudeCreate).not.toHaveBeenCalled()
      expect(mockPrisma.contentPiece.create).not.toHaveBeenCalled()
    })
  })

  describe('generate() — forceRegenerate', () => {
    it('creates new version when forceRegenerate=true', async () => {
      const existingPiece = {
        id: 'piece-001',
        themeId: THEME_ID,
        funnelStage: 'AWARENESS',
        recommendedChannel: 'LINKEDIN',
        angles: [
          { id: 'a1', generationVersion: 1 },
          { id: 'a2', generationVersion: 1 },
          { id: 'a3', generationVersion: 1 },
        ],
      }
      mockPrisma.contentPiece.findFirst.mockResolvedValue(existingPiece)
      mockThemeActive()
      mockBuildContext.mockResolvedValue(mockContext)
      mockHasMinimumContent.mockReturnValue(true)
      mockClaudeSuccess()
      mockPrisma.contentAngleVariant.create.mockResolvedValue({})
      mockPrisma.apiUsageLog.create.mockResolvedValue({})

      const finalPiece = { ...existingPiece, angles: claudeAnglesResponse }
      mockPrisma.contentPiece.findUniqueOrThrow.mockResolvedValue(finalPiece)

      await AngleGenerationService.generate(THEME_ID, { forceRegenerate: true })

      // Should NOT create a new piece (reuses existing)
      expect(mockPrisma.contentPiece.create).not.toHaveBeenCalled()
      // Should create 3 new angle variants with version 2
      expect(mockPrisma.contentAngleVariant.create).toHaveBeenCalledTimes(3)
      const firstCall = mockPrisma.contentAngleVariant.create.mock.calls[0][0]
      expect(firstCall.data.generationVersion).toBe(2)
    })
  })

  describe('generate() — error: inactive theme', () => {
    it('throws CONTENT_050 for inactive theme', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(null)
      mockPrisma.theme.findUnique.mockResolvedValue({ id: THEME_ID, title: 'Test', status: 'INACTIVE' })

      await expect(
        AngleGenerationService.generate(THEME_ID, {})
      ).rejects.toThrow(ContentBusinessRuleError)

      try {
        await AngleGenerationService.generate(THEME_ID, {})
      } catch (err) {
        expect((err as ContentBusinessRuleError).code).toBe('CONTENT_050')
      }
    })
  })

  describe('generate() — error: no knowledge base', () => {
    it('throws CONTENT_051 when knowledge base is empty', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(null)
      mockThemeActive()
      mockBuildContext.mockResolvedValue({
        theme: { id: THEME_ID, title: 'Test' },
        pains: [],
        cases: [],
        patterns: [],
      })
      mockHasMinimumContent.mockReturnValue(false)

      await expect(
        AngleGenerationService.generate(THEME_ID, {})
      ).rejects.toThrow(ContentBusinessRuleError)

      try {
        await AngleGenerationService.generate(THEME_ID, {})
      } catch (err) {
        expect((err as ContentBusinessRuleError).code).toBe('CONTENT_051')
      }
    })
  })

  describe('generate() — error: Claude parse error', () => {
    it('throws CONTENT_053 when Claude returns unparseable response', async () => {
      mockPrisma.contentPiece.findFirst.mockResolvedValue(null)
      mockThemeActive()
      mockBuildContext.mockResolvedValue(mockContext)
      mockHasMinimumContent.mockReturnValue(true)

      mockClaudeCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'This is not valid JSON at all' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      await expect(
        AngleGenerationService.generate(THEME_ID, {})
      ).rejects.toThrow(ContentBusinessRuleError)

      try {
        await AngleGenerationService.generate(THEME_ID, {})
      } catch (err) {
        expect((err as ContentBusinessRuleError).code).toBe('CONTENT_053')
      }
    })
  })
})
