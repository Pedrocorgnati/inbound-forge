import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { importKnowledge, type ImportStrategy } from '@/lib/knowledge/import-export.service'
import {
  checkImportRateLimit,
  validateImportPayloadSize,
  validateImportEntryCount,
  IMPORT_RATE_LIMIT,
} from '@/lib/knowledge/import-rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: 'SESSION_REQUIRED' }, { status: 401 })

  const rateLimit = await checkImportRateLimit(user.id)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        code: 'RATE_LIMITED',
        message: `Limite de ${IMPORT_RATE_LIMIT.maxPerWindow} imports por hora atingido`,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds
          ? { 'Retry-After': String(rateLimit.retryAfterSeconds) }
          : undefined,
      }
    )
  }

  const url = new URL(request.url)
  const strategy = (url.searchParams.get('strategy') ?? 'skip') as ImportStrategy
  if (!['skip', 'merge', 'replace'].includes(strategy)) {
    return NextResponse.json({ code: 'ERR-001', message: 'strategy invalido' }, { status: 400 })
  }

  const rawBody = await request.text()
  const sizeCheck = validateImportPayloadSize(Buffer.byteLength(rawBody, 'utf8'))
  if (!sizeCheck.ok) {
    return NextResponse.json(
      { code: sizeCheck.reason, message: sizeCheck.detail },
      { status: 413 }
    )
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ code: 'ERR-001', message: 'JSON invalido' }, { status: 400 })
  }

  const entryCheck = validateImportEntryCount(payload)
  if (!entryCheck.ok) {
    return NextResponse.json(
      { code: entryCheck.reason, message: entryCheck.detail },
      { status: 413 }
    )
  }

  try {
    const stats = await importKnowledge(payload, strategy)
    return NextResponse.json({
      stats,
      strategy,
      rateLimitRemaining: rateLimit.remaining,
    })
  } catch (err) {
    return NextResponse.json(
      { code: 'ERR-001', message: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    )
  }
}
