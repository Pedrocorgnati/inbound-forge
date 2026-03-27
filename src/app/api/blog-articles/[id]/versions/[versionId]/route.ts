// Module-11: Blog Article Versions — GET versão específica
// Rastreabilidade: TASK-4 ST002, FEAT-publishing-blog-005
// Error Catalog: BLOG_001, BLOG_081

import { NextRequest } from 'next/server'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { blogVersionService } from '@/lib/services/blog-version.service'

type Params = { params: { id: string; versionId: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response // BLOG_001

  try {
    const version = await blogVersionService.getVersion(params.id, params.versionId)
    return ok(version)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    if (message.includes('BLOG_081')) {
      return notFound('BLOG_081: Versão não encontrada ou não pertence a este artigo')
    }
    console.error('[GET /api/blog-articles/[id]/versions/[versionId]]', err)
    return internalError()
  }
}
