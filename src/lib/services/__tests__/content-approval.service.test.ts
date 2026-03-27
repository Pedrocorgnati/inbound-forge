import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ContentBusinessRuleError, ContentNotFoundError } from '@/lib/errors/content-errors'
import { SCORE_DECAY } from '@/lib/constants/content.constants'

// ─── Hoisted Mocks ───────────────────────────────────────────────────────────

const { mockPrisma, mockTx, mockLogAudit, mockRecordAndAnalyze } = vi.hoisted(() => {
  const mockTx = {
    contentAngleVariant: {
      updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      update: vi.fn().mockResolvedValue({}),
    },
    contentPiece: {
      update: vi.fn(),
    },
    contentRejection: {
      create: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    theme: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  }
  const mockPrisma = {
    contentPiece: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  }
  const mockLogAudit = vi.fn().mockResolvedValue(undefined)
  const mockRecordAndAnalyze = vi.fn().mockResolvedValue([])
  return { mockPrisma, mockTx, mockLogAudit, mockRecordAndAnalyze }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

vi.mock('@/lib/audit/log', () => ({
  logAudit: mockLogAudit,
}))

vi.mock('../prompt-feedback.service', () => ({
  PromptFeedbackService: {
    recordAndAnalyze: mockRecordAndAnalyze,
  },
}))

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { ContentApprovalService } from '../content-approval.service'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PIECE_ID = 'piece-uuid-001'
const ANGLE_ID = 'angle-uuid-001'
const OPERATOR_ID = 'operator-uuid-001'
const THEME_ID = 'theme-001'

function makePiece(overrides: Record<string, unknown> = {}) {
  return {
    id: PIECE_ID,
    themeId: THEME_ID,
    status: 'DRAFT',
    angles: [
      { id: ANGLE_ID, angle: 'AGGRESSIVE' },
      { id: 'angle-uuid-002', angle: 'CONSULTIVE' },
      { id: 'angle-uuid-003', angle: 'AUTHORIAL' },
    ],
    ...overrides,
  }
}

function makeTheme(opportunityScore = 100) {
  return { id: THEME_ID, opportunityScore }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ContentApprovalService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-set $transaction default after clearAllMocks
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx))
    mockTx.contentAngleVariant.updateMany.mockResolvedValue({ count: 2 })
    mockTx.contentAngleVariant.update.mockResolvedValue({})
    mockTx.contentRejection.create.mockResolvedValue({})
    mockTx.contentRejection.count.mockResolvedValue(0)
    mockTx.theme.update.mockResolvedValue({})
  })

  // ─── approve() ───────────────────────────────────────────────────────────

  describe('approve()', () => {
    it('approves piece with valid selected angle, returns APPROVED status', async () => {
      const piece = makePiece()
      mockPrisma.contentPiece.findUnique.mockResolvedValue(piece)

      const approvedPiece = { ...piece, status: 'APPROVED', selectedAngle: 'AGGRESSIVE' }
      mockTx.contentPiece.update.mockResolvedValue(approvedPiece)

      const result = await ContentApprovalService.approve(PIECE_ID, ANGLE_ID, OPERATOR_ID)

      expect(result.status).toBe('APPROVED')
      expect(mockTx.contentAngleVariant.updateMany).toHaveBeenCalledWith({
        where: { pieceId: PIECE_ID, id: { not: ANGLE_ID } },
        data: { isSelected: false },
      })
      expect(mockTx.contentAngleVariant.update).toHaveBeenCalledWith({
        where: { id: ANGLE_ID },
        data: { isSelected: true },
      })
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'content.approve',
          entityId: PIECE_ID,
        })
      )
    })

    it('throws ContentNotFoundError when piece does not exist', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(null)

      await expect(
        ContentApprovalService.approve(PIECE_ID, ANGLE_ID, OPERATOR_ID)
      ).rejects.toThrow(ContentNotFoundError)
    })

    it('throws CONTENT_060 when piece is already APPROVED', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(makePiece({ status: 'APPROVED' }))

      await expect(
        ContentApprovalService.approve(PIECE_ID, ANGLE_ID, OPERATOR_ID)
      ).rejects.toThrow(ContentBusinessRuleError)

      try {
        await ContentApprovalService.approve(PIECE_ID, ANGLE_ID, OPERATOR_ID)
      } catch (err) {
        expect((err as ContentBusinessRuleError).code).toBe('CONTENT_060')
      }
    })

    it('throws CONTENT_061 when selectedAngleId does not belong to piece', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(makePiece())

      await expect(
        ContentApprovalService.approve(PIECE_ID, 'non-existent-angle', OPERATOR_ID)
      ).rejects.toThrow(ContentBusinessRuleError)

      try {
        await ContentApprovalService.approve(PIECE_ID, 'non-existent-angle', OPERATOR_ID)
      } catch (err) {
        expect((err as ContentBusinessRuleError).code).toBe('CONTENT_061')
      }
    })
  })

  // ─── reject() ────────────────────────────────────────────────────────────

  describe('reject()', () => {
    it('creates ContentRejection and updates piece to REVIEW', async () => {
      const piece = makePiece({ angles: undefined })
      mockPrisma.contentPiece.findUnique.mockResolvedValue(
        { id: PIECE_ID, themeId: THEME_ID, status: 'DRAFT' }
      )
      mockTx.contentRejection.count.mockResolvedValue(1) // 1ª rejeição — sem decay
      const updatedPiece = { ...piece, status: 'REVIEW', angles: [] }
      mockTx.contentPiece.update.mockResolvedValue(updatedPiece)

      const result = await ContentApprovalService.reject(
        PIECE_ID,
        'O conteudo esta muito generico e nao apresenta dados concretos',
        OPERATOR_ID
      )

      expect(result.status).toBe('REVIEW')
      expect(mockTx.contentRejection.create).toHaveBeenCalledWith({
        data: {
          pieceId: PIECE_ID,
          reason: 'O conteudo esta muito generico e nao apresenta dados concretos',
        },
      })
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'content.reject' })
      )
    })

    it('creates ContentRejection with angle when provided', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(
        { id: PIECE_ID, themeId: THEME_ID, status: 'DRAFT' }
      )
      mockTx.contentRejection.count.mockResolvedValue(1)
      mockTx.contentPiece.update.mockResolvedValue({ status: 'REVIEW', angles: [] })

      await ContentApprovalService.reject(
        PIECE_ID,
        'Texto agressivo demais para o publico alvo',
        OPERATOR_ID,
        'AGGRESSIVE' as never
      )

      expect(mockTx.contentRejection.create).toHaveBeenCalledWith({
        data: {
          pieceId: PIECE_ID,
          reason: 'Texto agressivo demais para o publico alvo',
          angle: 'AGGRESSIVE',
        },
      })
    })

    it('throws ContentNotFoundError when piece does not exist', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(null)

      await expect(
        ContentApprovalService.reject(PIECE_ID, 'Reason text here for rejection', OPERATOR_ID)
      ).rejects.toThrow(ContentNotFoundError)
    })

    it('calls PromptFeedbackService.recordAndAnalyze non-blocking (no throw on failure)', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(
        { id: PIECE_ID, themeId: THEME_ID, status: 'DRAFT' }
      )
      mockTx.contentRejection.count.mockResolvedValue(1)
      mockTx.contentPiece.update.mockResolvedValue({ status: 'REVIEW', angles: [] })
      mockRecordAndAnalyze.mockRejectedValue(new Error('Feedback fail'))

      const result = await ContentApprovalService.reject(
        PIECE_ID,
        'Motivo valido de rejeicao do conteudo',
        OPERATOR_ID
      )

      expect(result.status).toBe('REVIEW')
    })

    // ─── RN-006: Score Decay Tests ──────────────────────────────────────────

    it('[RN-006] rejeição 1x — score NÃO decai, apenas rejectionCount atualizado', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(
        { id: PIECE_ID, themeId: THEME_ID, status: 'DRAFT' }
      )
      mockTx.contentRejection.count.mockResolvedValue(1) // 1 % 3 !== 0 → sem decay
      mockTx.contentPiece.update.mockResolvedValue({ status: 'REVIEW', angles: [] })

      await ContentApprovalService.reject(PIECE_ID, 'Razao de rejeicao valida', OPERATOR_ID)

      // theme.findUnique NÃO deve ser chamado (não há decay)
      expect(mockTx.theme.findUnique).not.toHaveBeenCalled()
      // theme.update deve ser chamado apenas com rejectionCount (sem opportunityScore)
      expect(mockTx.theme.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { rejectionCount: 1 },
        })
      )
    })

    it('[RN-006] rejeição 2x — score NÃO decai', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(
        { id: PIECE_ID, themeId: THEME_ID, status: 'DRAFT' }
      )
      mockTx.contentRejection.count.mockResolvedValue(2) // 2 % 3 !== 0 → sem decay
      mockTx.contentPiece.update.mockResolvedValue({ status: 'REVIEW', angles: [] })

      await ContentApprovalService.reject(PIECE_ID, 'Razao de rejeicao valida', OPERATOR_ID)

      expect(mockTx.theme.findUnique).not.toHaveBeenCalled()
      expect(mockTx.theme.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { rejectionCount: 2 },
        })
      )
    })

    it('[RN-006] rejeição 3x — score decai 30% (opportunityScore × 0.7)', async () => {
      const INITIAL_SCORE = 100
      mockPrisma.contentPiece.findUnique.mockResolvedValue(
        { id: PIECE_ID, themeId: THEME_ID, status: 'DRAFT' }
      )
      mockTx.contentRejection.count.mockResolvedValue(3) // 3 % 3 === 0 → DECAY
      mockTx.theme.findUnique.mockResolvedValue(makeTheme(INITIAL_SCORE))
      mockTx.contentPiece.update.mockResolvedValue({ status: 'REVIEW', angles: [] })

      await ContentApprovalService.reject(PIECE_ID, 'Razao de rejeicao valida', OPERATOR_ID)

      const expectedScore = parseFloat(
        Math.max(SCORE_DECAY.MIN_SCORE, INITIAL_SCORE * SCORE_DECAY.DECAY_MULTIPLIER)
          .toFixed(SCORE_DECAY.SCORE_PRECISION)
      ) // 70.00

      expect(mockTx.theme.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { opportunityScore: expectedScore, rejectionCount: 3 },
        })
      )
      expect(expectedScore).toBe(70)
    })

    it('[RN-006] rejeição 4x — score NÃO decai novamente (não é múltiplo de 3)', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(
        { id: PIECE_ID, themeId: THEME_ID, status: 'DRAFT' }
      )
      mockTx.contentRejection.count.mockResolvedValue(4) // 4 % 3 !== 0 → sem decay
      mockTx.contentPiece.update.mockResolvedValue({ status: 'REVIEW', angles: [] })

      await ContentApprovalService.reject(PIECE_ID, 'Razao de rejeicao valida', OPERATOR_ID)

      expect(mockTx.theme.findUnique).not.toHaveBeenCalled()
      expect(mockTx.theme.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { rejectionCount: 4 },
        })
      )
    })

    it('[RN-006] rejeição 6x — score decai novamente (acumulativo: 70% × 70% = 49%)', async () => {
      const SCORE_AFTER_3_REJECTIONS = 70 // resultado do primeiro decay
      mockPrisma.contentPiece.findUnique.mockResolvedValue(
        { id: PIECE_ID, themeId: THEME_ID, status: 'DRAFT' }
      )
      mockTx.contentRejection.count.mockResolvedValue(6) // 6 % 3 === 0 → DECAY
      mockTx.theme.findUnique.mockResolvedValue(makeTheme(SCORE_AFTER_3_REJECTIONS))
      mockTx.contentPiece.update.mockResolvedValue({ status: 'REVIEW', angles: [] })

      await ContentApprovalService.reject(PIECE_ID, 'Razao de rejeicao valida', OPERATOR_ID)

      const expectedScore = parseFloat(
        Math.max(SCORE_DECAY.MIN_SCORE, SCORE_AFTER_3_REJECTIONS * SCORE_DECAY.DECAY_MULTIPLIER)
          .toFixed(SCORE_DECAY.SCORE_PRECISION)
      ) // 49.00

      expect(mockTx.theme.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { opportunityScore: expectedScore, rejectionCount: 6 },
        })
      )
      expect(expectedScore).toBe(49)
    })

    it('[RN-006] score NUNCA fica negativo — mínimo é 0.0', async () => {
      const NEAR_ZERO_SCORE = 0.001 // score quase zero
      mockPrisma.contentPiece.findUnique.mockResolvedValue(
        { id: PIECE_ID, themeId: THEME_ID, status: 'DRAFT' }
      )
      mockTx.contentRejection.count.mockResolvedValue(3)
      mockTx.theme.findUnique.mockResolvedValue(makeTheme(NEAR_ZERO_SCORE))
      mockTx.contentPiece.update.mockResolvedValue({ status: 'REVIEW', angles: [] })

      await ContentApprovalService.reject(PIECE_ID, 'Razao de rejeicao valida', OPERATOR_ID)

      const callArgs = mockTx.theme.update.mock.calls[0][0]
      expect(callArgs.data.opportunityScore).toBeGreaterThanOrEqual(SCORE_DECAY.MIN_SCORE)
    })

    it('[RN-006] tema com score já zero — permanece zero após decay', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(
        { id: PIECE_ID, themeId: THEME_ID, status: 'DRAFT' }
      )
      mockTx.contentRejection.count.mockResolvedValue(3)
      mockTx.theme.findUnique.mockResolvedValue(makeTheme(0)) // score já zero
      mockTx.contentPiece.update.mockResolvedValue({ status: 'REVIEW', angles: [] })

      await ContentApprovalService.reject(PIECE_ID, 'Razao de rejeicao valida', OPERATOR_ID)

      expect(mockTx.theme.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { opportunityScore: 0, rejectionCount: 3 },
        })
      )
    })
  })
})
