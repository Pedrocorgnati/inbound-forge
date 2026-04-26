/**
 * TASK-2/ST003 — Re-enfileira um post reutilizando conteudo Claude ja gerado.
 * Gap CL-135. Nao chama Claude.
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { republishWithReuse } from '@/lib/services/content-reuse.service'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { response, user } = await requireSession()
  if (response) return response

  const { id } = await params
  try {
    const result = await republishWithReuse(id, user?.id)
    return ok(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    if (message.includes('nao encontrado')) return notFound(message)
    return internalError(message)
  }
}
