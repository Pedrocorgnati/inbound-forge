// GET /api/v1/content/[pieceId]/versions — lista versoes (TASK-12 ST001 / CL-076)
// POST /api/v1/content/[pieceId]/versions — rollback para versao anterior (TASK-10 ST004 / CL-051)

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, internalError, validationError, notFound } from '@/lib/api-auth'
import { listVersions, restoreVersion } from '@/lib/content/versioning.service'

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

const RollbackSchema = z.object({
  action: z.literal('rollback'),
  version_id: z.string().min(1),
})

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = RollbackSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const { pieceId } = await params
    await restoreVersion(pieceId, parsed.data.version_id, user!.id)
    const versions = await listVersions(pieceId)
    return ok({ restored: true, versions })
  } catch (err) {
    if (err instanceof Error && err.message === 'version_not_found') {
      return notFound('Versão não encontrada.')
    }
    return internalError()
  }
}
