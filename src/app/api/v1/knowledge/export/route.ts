import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { exportKnowledge, toCsvBundle } from '@/lib/knowledge/import-export.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: 'SESSION_REQUIRED' }, { status: 401 })

  const url = new URL(request.url)
  const format = (url.searchParams.get('format') ?? 'json') as 'json' | 'csv'
  const payload = await exportKnowledge()

  if (format === 'csv') {
    const bundle = toCsvBundle(payload)
    const boundary = 'kb-csv-bundle'
    const parts = Object.entries(bundle).map(([name, content]) =>
      `--${boundary}\r\nContent-Disposition: attachment; filename="${name}"\r\nContent-Type: text/csv\r\n\r\n${content}\r\n`
    )
    const body = `${parts.join('')}--${boundary}--`
    return new NextResponse(body, {
      headers: { 'content-type': `multipart/mixed; boundary=${boundary}` },
    })
  }

  return NextResponse.json(payload)
}
