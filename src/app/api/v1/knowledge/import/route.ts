import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { importKnowledge, type ImportStrategy } from '@/lib/knowledge/import-export.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: 'SESSION_REQUIRED' }, { status: 401 })

  const url = new URL(request.url)
  const strategy = (url.searchParams.get('strategy') ?? 'skip') as ImportStrategy
  if (!['skip', 'merge', 'replace'].includes(strategy)) {
    return NextResponse.json({ code: 'ERR-001', message: 'strategy invalido' }, { status: 400 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ code: 'ERR-001', message: 'JSON invalido' }, { status: 400 })
  }

  try {
    const stats = await importKnowledge(payload, strategy)
    return NextResponse.json({ stats, strategy })
  } catch (err) {
    return NextResponse.json(
      { code: 'ERR-001', message: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    )
  }
}
