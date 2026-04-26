// Content versioning — snapshot antes de mutacao, restore atomico (TASK-12 ST001 / CL-076)

import 'server-only'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

type CopyFields = {
  baseTitle?: string
  editedText?: string | null
  selectedAngle?: string | null
}

type VariantSnapshot = Array<{
  id: string
  angle: string
  text: string
  editedBody?: string | null
  ctaText?: string | null
  hashtags?: string[]
  isSelected: boolean
}>

export interface ContentSnapshot {
  copy: CopyFields
  variantSnapshot: VariantSnapshot
}

async function buildSnapshot(pieceId: string): Promise<ContentSnapshot | null> {
  const piece = await prisma.contentPiece.findUnique({
    where: { id: pieceId },
    select: {
      baseTitle: true,
      editedText: true,
      selectedAngle: true,
      angles: {
        select: {
          id: true,
          angle: true,
          text: true,
          editedBody: true,
          ctaText: true,
          hashtags: true,
          isSelected: true,
        },
      },
    },
  })
  if (!piece) return null
  return {
    copy: {
      baseTitle: piece.baseTitle,
      editedText: piece.editedText,
      selectedAngle: piece.selectedAngle ?? null,
    },
    variantSnapshot: piece.angles.map((a) => ({
      id: a.id,
      angle: a.angle,
      text: a.text,
      editedBody: a.editedBody ?? null,
      ctaText: a.ctaText ?? null,
      hashtags: a.hashtags ?? [],
      isSelected: a.isSelected,
    })),
  }
}

export async function captureVersion(
  pieceId: string,
  userId: string | null,
  changeSummary?: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const snap = await buildSnapshot(pieceId)
  if (!snap) return
  const db = tx ?? prisma
  await db.contentPieceVersion.create({
    data: {
      pieceId,
      copy: snap.copy as never,
      variantSnapshot: snap.variantSnapshot as never,
      changeSummary: changeSummary ?? null,
      createdBy: userId,
    },
  })
}

export async function listVersions(pieceId: string) {
  return prisma.contentPieceVersion.findMany({
    where: { pieceId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      createdBy: true,
      changeSummary: true,
    },
  })
}

export async function restoreVersion(pieceId: string, versionId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.contentPieceVersion.findUnique({
      where: { id: versionId },
      select: { pieceId: true, copy: true, variantSnapshot: true },
    })
    if (!version || version.pieceId !== pieceId) {
      throw new Error('version_not_found')
    }
    // Snapshot antes de restaurar (para reversao)
    await captureVersion(pieceId, userId, 'Pre-restore snapshot', tx)

    const copy = version.copy as CopyFields
    await tx.contentPiece.update({
      where: { id: pieceId },
      data: {
        baseTitle: copy.baseTitle ?? undefined,
        editedText: copy.editedText ?? null,
      },
    })

    const variants = version.variantSnapshot as VariantSnapshot
    for (const v of variants) {
      await tx.contentAngleVariant.updateMany({
        where: { id: v.id },
        data: {
          editedBody: v.editedBody,
          ctaText: v.ctaText,
          hashtags: v.hashtags,
          isSelected: v.isSelected,
        },
      })
    }
  })
}
