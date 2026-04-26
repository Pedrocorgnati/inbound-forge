/**
 * TASK-9/ST001 (CL-208) — Endpoint de backlinks para knowledge entries.
 */
import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { requireSession } from '@/lib/api-auth'
import { getBacklinks, type KnowledgeType } from '@/lib/services/knowledge-graph.service'

type Params = { params: Promise<{ id: string }> }

const cachedBacklinks = unstable_cache(
  async (type: KnowledgeType, id: string) => getBacklinks(type, id),
  ['knowledge-backlinks'],
  { revalidate: 300, tags: ['knowledge-backlinks'] }
)

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params
  const typeParam = request.nextUrl.searchParams.get('type')
  if (typeParam !== 'pain' && typeParam !== 'case' && typeParam !== 'pattern') {
    return NextResponse.json(
      { success: false, error: 'Query param "type" obrigatorio: pain | case | pattern' },
      { status: 400 }
    )
  }

  try {
    const backlinks = await cachedBacklinks(typeParam, id)
    return NextResponse.json(
      { success: true, data: backlinks },
      { headers: { 'Cache-Control': 'private, max-age=300' } }
    )
  } catch (err) {
    console.error('[GET /knowledge/:id/backlinks]', err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
