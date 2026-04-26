// Module-11: Blog Article Versions — GET lista de versões
// Rastreabilidade: TASK-4 ST002, FEAT-publishing-blog-005, SEC-007
// Error Catalog: BLOG_001

import { NextRequest } from 'next/server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { blogVersionService } from '@/lib/services/blog-version.service'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { response } = await requireSession()
  if (response) return response // BLOG_001

  try {
    const versions = await blogVersionService.listVersions(id)
    return ok(versions)
  } catch (err) {
    console.error('[GET /api/blog-articles/[id]/versions]', err)
    return internalError()
  }
}
