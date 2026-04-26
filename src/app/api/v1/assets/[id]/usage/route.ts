// Intake Review TASK-10 ST003 (CL-242) — retorna impacto de deletar um asset:
// quais ImageJobs e ContentPieces referenciam a URL do asset.

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response
  const { id } = await params

  try {
    const asset = await prisma.visualAsset.findUnique({
      where: { id },
      select: { id: true, storageUrl: true, fileName: true },
    })
    if (!asset) return notFound('Asset não encontrado')

    const url = asset.storageUrl

    const [jobs, contentPieces] = await Promise.all([
      prisma.imageJob.findMany({
        where: {
          OR: [{ imageUrl: url }, { outputUrl: url }, { backgroundUrl: url }],
        },
        select: { id: true, contentPieceId: true, status: true, templateType: true },
        take: 50,
      }),
      prisma.contentPiece.findMany({
        where: { OR: [{ generatedImageUrl: url }, { generatedVideoUrl: url }] },
        select: { id: true, baseTitle: true, status: true },
        take: 50,
      }),
    ])

    const items = [
      ...jobs.map((j) => ({
        type: 'image_job' as const,
        id: j.id,
        label: `ImageJob ${j.templateType} [${j.status}]`,
        contentPieceId: j.contentPieceId,
      })),
      ...contentPieces.map((c) => ({
        type: 'content_piece' as const,
        id: c.id,
        label: c.baseTitle ?? c.id,
        status: c.status,
      })),
    ]

    return ok({ count: items.length, items })
  } catch {
    return internalError()
  }
}
