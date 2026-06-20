/**
 * GET /api/v1/publishing-queue — lista os itens da fila de publicação.
 *
 * Consumido por QueueBoard.tsx (board /fila e /forms). Mapeia o QueueStatus
 * canônico (PENDING/PROCESSING/PAUSED/DONE/FAILED/CANCELLED) para os rótulos
 * que o board exibe (PENDING/PROCESSING/SCHEDULED/PUBLISHED/FAILED) e deriva
 * um título legível a partir do caption do Post relacionado.
 */
import { prisma } from '@/lib/prisma'
import { requireSession, ok, internalError } from '@/lib/api-auth'

type BoardStatus = 'PENDING' | 'PROCESSING' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED'

function deriveTitle(caption: string, id: string): string {
  const trimmed = caption.trim().replace(/\s+/g, ' ')
  if (trimmed.length === 0) return `Post ${id.slice(0, 8)}`
  return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed
}

function mapStatus(status: string, scheduledAt: Date | null): BoardStatus {
  switch (status) {
    case 'DONE':
      return 'PUBLISHED'
    case 'PROCESSING':
      return 'PROCESSING'
    case 'FAILED':
      return 'FAILED'
    case 'PENDING':
      // Agendado para o futuro → coluna SCHEDULED; senão fica em PENDING.
      return scheduledAt && scheduledAt.getTime() > Date.now() ? 'SCHEDULED' : 'PENDING'
    default:
      // PAUSED / CANCELLED não têm coluna própria; caem em PENDING.
      return 'PENDING'
  }
}

export async function GET() {
  const { response } = await requireSession()
  if (response) return response

  try {
    const rows = await prisma.publishingQueue.findMany({
      orderBy: [{ scheduledAt: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        status: true,
        scheduledAt: true,
        post: { select: { caption: true } },
      },
    })

    const data = rows.map((r) => ({
      id: r.id,
      title: deriveTitle(r.post?.caption ?? '', r.id),
      status: mapStatus(r.status, r.scheduledAt),
      scheduledAt: r.scheduledAt ? r.scheduledAt.toISOString() : null,
    }))

    return ok(data)
  } catch {
    return internalError('Erro ao listar a fila de publicação')
  }
}
