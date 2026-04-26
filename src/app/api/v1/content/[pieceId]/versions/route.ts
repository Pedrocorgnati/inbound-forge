// GET /api/v1/content/[pieceId]/versions — lista versoes (TASK-12 ST001 / CL-076)

import { requireSession, ok, internalError } from '@/lib/api-auth'
import { listVersions } from '@/lib/content/versioning.service'

type Params = { params: Promise<{ pieceId: string }> }

export async function GET(_: Request, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response
  try {
    const { pieceId } = await params
    const versions = await listVersions(pieceId)
    return ok({ versions })
  } catch {
    return internalError()
  }
}
