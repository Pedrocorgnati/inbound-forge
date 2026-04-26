// GET /api/v1/content/[pieceId]/export?format=markdown|txt
// Intake-Review TASK-21 ST003 (CL-CS-012): export de ContentPiece em markdown ou txt.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, notFound, validationError, internalError } from '@/lib/api-auth'

type Params = { params: Promise<{ pieceId: string }> }

const QuerySchema = z.object({
  format: z.enum(['markdown', 'txt']).default('markdown'),
})

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.+?)\]\((.+?)\)/g, '$1 ($2)')
    .replace(/>\s*/g, '')
    .replace(/^\s*[-*+]\s+/gm, '- ')
}

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { pieceId } = await params
  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({ format: searchParams.get('format') ?? undefined })
  if (!parsed.success) return validationError(parsed.error)

  try {
    const piece = await prisma.contentPiece.findUnique({
      where: { id: pieceId },
      include: { theme: { select: { title: true } } },
    })
    if (!piece) return notFound('ContentPiece nao encontrado')

    const title = piece.baseTitle || piece.theme?.title || 'sem-titulo'
    const body = piece.editedText ?? '(sem corpo)'

    let output: string
    let contentType: string
    let ext: string
    if (parsed.data.format === 'markdown') {
      output = [
        `# ${title}`,
        '',
        `**Tema:** ${piece.theme?.title ?? '—'}`,
        `**Angle:** ${piece.selectedAngle ?? '—'}`,
        `**Status:** ${piece.status}`,
        `**Canal:** ${piece.recommendedChannel}`,
        '',
        '---',
        '',
        body,
      ].join('\n')
      contentType = 'text/markdown; charset=utf-8'
      ext = 'md'
    } else {
      output = `${title}\n\n${stripMarkdown(body)}`
      contentType = 'text/plain; charset=utf-8'
      ext = 'txt'
    }

    const slug = title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .toLowerCase()
      .slice(0, 60)
    const filename = `content-${slug || piece.id.slice(0, 8)}.${ext}`

    return new Response(output, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return internalError()
  }
}
