import { handleListVersions } from '../../../_shared/versions-handlers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleListVersions('objection', params)
}
