import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoisted Mocks ───────────────────────────────────────────────────────────

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    contentPiece: {
      findMany: vi.fn(),
    },
    contentRejection: {
      findMany: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { PromptFeedbackService } from '../prompt-feedback.service'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const THEME_ID = 'theme-uuid-001'

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PromptFeedbackService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── getFeedbackHints() ──────────────────────────────────────────────────

  describe('getFeedbackHints()', () => {
    it('returns empty array when no pieces exist for theme', async () => {
      mockPrisma.contentPiece.findMany.mockResolvedValue([])

      const result = await PromptFeedbackService.getFeedbackHints(THEME_ID)

      expect(result).toEqual([])
      expect(mockPrisma.contentRejection.findMany).not.toHaveBeenCalled()
    })

    it('returns empty array when fewer than 2 rejections exist', async () => {
      mockPrisma.contentPiece.findMany.mockResolvedValue([{ id: 'piece-001' }])
      mockPrisma.contentRejection.findMany.mockResolvedValue([
        { reason: 'Conteudo muito longo demais' },
      ])

      const result = await PromptFeedbackService.getFeedbackHints(THEME_ID)

      expect(result).toEqual([])
    })

    it('returns hint when 2+ rejections match a pattern', async () => {
      mockPrisma.contentPiece.findMany.mockResolvedValue([
        { id: 'piece-001' },
        { id: 'piece-002' },
      ])
      mockPrisma.contentRejection.findMany.mockResolvedValue([
        { reason: 'Texto muito longo para o formato desejado' },
        { reason: 'Conteudo extenso demais, precisa ser mais curto' },
        { reason: 'Ficou bom mas o CTA esta fraco' },
      ])

      const result = await PromptFeedbackService.getFeedbackHints(THEME_ID)

      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result[0]).toContain('comprimento')
    })

    it('returns multiple hints when multiple patterns match', async () => {
      mockPrisma.contentPiece.findMany.mockResolvedValue([{ id: 'piece-001' }])
      mockPrisma.contentRejection.findMany.mockResolvedValue([
        { reason: 'Texto muito longo demais' },
        { reason: 'Conteudo extenso e muito técnico' },
        { reason: 'Ficou longo demais de novo' },
        { reason: 'Muito técnico, nao entendo nada' },
      ])

      const result = await PromptFeedbackService.getFeedbackHints(THEME_ID)

      expect(result.length).toBeGreaterThanOrEqual(2)
      const combined = result.join(' ')
      expect(combined).toContain('comprimento')
      expect(combined).toContain('acessível')
    })

    it('returns empty array when rejections do not match any pattern', async () => {
      mockPrisma.contentPiece.findMany.mockResolvedValue([{ id: 'piece-001' }])
      mockPrisma.contentRejection.findMany.mockResolvedValue([
        { reason: 'Nao gostei do tom geral' },
        { reason: 'Prefiro outra abordagem visual' },
        { reason: 'Tema nao conecta com publico' },
      ])

      const result = await PromptFeedbackService.getFeedbackHints(THEME_ID)

      expect(result).toEqual([])
    })
  })

  // ─── recordAndAnalyze() ──────────────────────────────────────────────────

  describe('recordAndAnalyze()', () => {
    it('returns empty array when no pieces exist', async () => {
      mockPrisma.contentPiece.findMany.mockResolvedValue([])

      const result = await PromptFeedbackService.recordAndAnalyze(THEME_ID)

      expect(result).toEqual([])
    })

    it('returns FeedbackHint objects with pattern, hint, and rejectionCount', async () => {
      mockPrisma.contentPiece.findMany.mockResolvedValue([{ id: 'piece-001' }])
      mockPrisma.contentRejection.findMany.mockResolvedValue([
        { reason: 'Conteudo genérico sem profundidade' },
        { reason: 'Ficou vago e superficial' },
        { reason: 'Muito genérico, precisa de mais dados' },
      ])

      const result = await PromptFeedbackService.recordAndAnalyze(THEME_ID)

      expect(result.length).toBeGreaterThanOrEqual(1)
      const hint = result[0]
      expect(hint).toHaveProperty('pattern')
      expect(hint).toHaveProperty('hint')
      expect(hint).toHaveProperty('rejectionCount')
      expect(hint.rejectionCount).toBeGreaterThanOrEqual(2)
    })

    it('takes up to 20 recent rejections', async () => {
      mockPrisma.contentPiece.findMany.mockResolvedValue([{ id: 'piece-001' }])
      mockPrisma.contentRejection.findMany.mockResolvedValue([])

      await PromptFeedbackService.recordAndAnalyze(THEME_ID)

      expect(mockPrisma.contentRejection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 })
      )
    })
  })
})
