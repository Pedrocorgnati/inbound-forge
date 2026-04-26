// POST /api/v1/content/[pieceId]/versions/[versionId]/restore (TASK-12 ST001 / CL-076)

import { NextResponse } from 'next/server'
import { requireSession, notFound, internalError } from '@/lib/api-auth'
import { restoreVersion } from '@/lib/content/versioning.service'
import { auditLog } from '@/lib/audit'

type Params = { params: Promise<{ pieceId: string; versionId: string }> }

export async function POST(_: Request, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response
  const { pieceId, versionId } = await params
  try {
    await restoreVersion(pieceId, versionId, user!.id)
    await auditLog({
      action: 'CONTENT_VERSION_RESTORED',
      entityType: 'ContentPiece',
      entityId: pieceId,
      userId: user!.id,
      metadata: { versionId },
    }).catch(() => undefined)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'version_not_found') {
      return notFound('Versao nao encontrada')
    }
    return internalError()
  }
}
