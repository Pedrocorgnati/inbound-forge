/**
 * GET /api/v1/publishing-queue/[id]/download
 * Stream do PNG da arte associada ao post, forcando download.
 * Intake Review TASK-4 ST002 (CL-236).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, notFound, internalError } from '@/lib/api-auth'

type Params = { params: Promise<{ id: string }> }

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80) || 'arte'
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response
  const { id } = await params

  try {
    const item = await prisma.publishingQueue.findUnique({
      where: { id },
      include: {
        post: {
          select: {
            id: true,
            imageUrl: true,
            themeId: true,
            contentPieceId: true,
          },
        },
      },
    })
    if (!item) return notFound('Item da fila nao encontrado')

    let imageUrl = item.post.imageUrl ?? null
    let variant = 'arte'

    if (!imageUrl && item.post.contentPieceId) {
      const job = await prisma.imageJob.findFirst({
        where: { contentPieceId: item.post.contentPieceId, outputUrl: { not: null } },
        orderBy: { completedAt: 'desc' },
        select: { outputUrl: true, templateType: true },
      })
      if (job?.outputUrl) {
        imageUrl = job.outputUrl
        variant = String(job.templateType ?? 'arte').toLowerCase()
      }
    }

    if (!imageUrl) return notFound('Arte nao encontrada para este item')

    const upstream = await fetch(imageUrl)
    if (!upstream.ok || !upstream.body) {
      return internalError('Falha ao obter arte do storage')
    }

    const filename = `${sanitize(item.post.themeId ?? 'post')}-${sanitize(variant)}.png`

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[GET /api/v1/publishing-queue/:id/download]', err)
    return internalError()
  }
}
