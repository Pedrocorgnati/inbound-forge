/**
 * ContentApprovalService — Inbound Forge
 * Módulo: module-8-content-generation (TASK-3/ST001)
 *
 * Gerencia aprovação e rejeição de ContentPiece com propagação de status em transação.
 * Aprovação: ContentPiece APPROVED, Theme não precisa de mudança (ThemeStatus é independente).
 * Rejeição: ContentPiece REJECTED + ContentRejection criado.
 */
import { prisma } from '@/lib/prisma'
import { ContentAngle, ContentStatus } from '@prisma/client'
import { ContentBusinessRuleError, ContentNotFoundError } from '@/lib/errors/content-errors'
import { PromptFeedbackService } from './prompt-feedback.service'
import { logAudit } from '@/lib/audit/log'
import { SCORE_DECAY } from '@/lib/constants/content.constants'
import { captureException } from '@/lib/sentry'

export class ContentApprovalService {
  /**
   * Aprova um ContentPiece e marca o ângulo selecionado.
   * Transação: ContentPiece.status → APPROVED, ContentAngleVariant.isSelected → true.
   */
  static async approve(
    contentPieceId: string,
    selectedAngleId: string,
    operatorId: string
  ) {
    // Check piece exists
    const piece = await prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
      include: { angles: { select: { id: true, angle: true } } },
    })

    if (!piece) throw new ContentNotFoundError('ContentPiece')

    // Guard: already approved
    if (piece.status === ContentStatus.APPROVED) {
      throw new ContentBusinessRuleError('CONTENT_060', 'ContentPiece já aprovado')
    }

    // Guard: selectedAngleId must belong to this piece (anti-injection)
    const selectedAngle = piece.angles.find(a => a.id === selectedAngleId)
    if (!selectedAngle) {
      throw new ContentBusinessRuleError('CONTENT_061', 'Ângulo não pertence a este ContentPiece')
    }

    // Transaction: update piece + deselect others + select chosen angle
    const updatedPiece = await prisma.$transaction(async (tx) => {
      // Deselect all angles
      await tx.contentAngleVariant.updateMany({
        where: { pieceId: contentPieceId, id: { not: selectedAngleId } },
        data: { isSelected: false },
      })

      // Select chosen angle
      await tx.contentAngleVariant.update({
        where: { id: selectedAngleId },
        data: { isSelected: true },
      })

      // Approve piece
      return tx.contentPiece.update({
        where: { id: contentPieceId },
        data: {
          status: ContentStatus.APPROVED,
          selectedAngle: selectedAngle.angle as ContentAngle,
        },
        include: { angles: true },
      })
    })

    await logAudit({
      action: 'content.approve',
      entityType: 'ContentPiece',
      entityId: contentPieceId,
      operatorId,
      metadata: { selectedAngleId },
    })

    return updatedPiece
  }

  /**
   * Rejeita um ContentPiece e cria registro de ContentRejection.
   * Aplica RN-006: se o total de rejeições do tema atingir múltiplo de
   * REJECTION_THRESHOLD (3, 6, 9…), decai opportunityScore em 30%.
   * Não-bloqueante: PromptFeedbackService falha silenciosamente.
   */
  static async reject(
    contentPieceId: string,
    reason: string,
    operatorId: string,
    angle?: ContentAngle
  ) {
    // Check piece exists (inclui themeId para busca do tema)
    const piece = await prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
      select: { id: true, themeId: true, status: true },
    })

    if (!piece) throw new ContentNotFoundError('ContentPiece')

    // Transaction: create rejection + update piece status + aplicar score decay (RN-006)
    const updatedPiece = await prisma.$transaction(async (tx) => {
      // Create ContentRejection
      await tx.contentRejection.create({
        data: {
          pieceId: contentPieceId,
          reason,
          ...(angle ? { angle } : {}),
        },
      })

      // Contar total de rejeições de ContentPieces deste tema
      const totalRejections = await tx.contentRejection.count({
        where: { piece: { themeId: piece.themeId } },
      })

      // RN-006: decair opportunityScore a cada REJECTION_THRESHOLD rejeições
      if (totalRejections % SCORE_DECAY.REJECTION_THRESHOLD === 0) {
        const theme = await tx.theme.findUnique({
          where: { id: piece.themeId },
          select: { opportunityScore: true },
        })

        if (theme) {
          const decayedScore = parseFloat(
            Math.max(
              SCORE_DECAY.MIN_SCORE,
              theme.opportunityScore * SCORE_DECAY.DECAY_MULTIPLIER
            ).toFixed(SCORE_DECAY.SCORE_PRECISION)
          )

          await tx.theme.update({
            where: { id: piece.themeId },
            data: {
              opportunityScore: decayedScore,
              rejectionCount: totalRejections,
            },
          })
        }
      } else {
        // Atualiza apenas o rejectionCount sem decay
        await tx.theme.update({
          where: { id: piece.themeId },
          data: { rejectionCount: totalRejections },
        })
      }

      // Update piece to REVIEW (pode ser regenerado)
      return tx.contentPiece.update({
        where: { id: contentPieceId },
        data: { status: ContentStatus.REVIEW },
        include: { angles: true },
      })
    })

    await logAudit({
      action: 'content.reject',
      entityType: 'ContentPiece',
      entityId: contentPieceId,
      operatorId,
      metadata: { reason: '[redacted for SEC-008]', angle },
    })

    // Analyze feedback patterns — non-blocking
    try {
      await PromptFeedbackService.recordAndAnalyze(piece.themeId)
    } catch (err) {
      captureException(err, { service: 'PromptFeedback', themeId: piece.themeId })
    }

    return updatedPiece
  }
}
