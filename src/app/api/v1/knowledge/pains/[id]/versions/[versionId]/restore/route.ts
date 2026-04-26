import { handleRestore } from '../../../../../_shared/versions-handlers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  return handleRestore('pain', params)
}
