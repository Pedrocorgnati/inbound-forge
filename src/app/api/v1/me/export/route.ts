/**
 * TASK-5 ST002 (CL-AU-016): endpoint de portabilidade LGPD.
 * Retorna JSON agregado do operador autenticado com PII mascarada.
 * Rate-limit: 1 export / hora (TTL 3600) via Redis.
 */
import { NextResponse } from 'next/server'
import { requireSession, internalError } from '@/lib/api-auth'
import { auditLog, AUDIT_ACTIONS } from '@/lib/audit'
import { redis } from '@/lib/redis'
import { exportUserData } from '@/lib/services/user-export.service'

const RATE_TTL_SECONDS = 3600

export async function GET() {
  const { user, response } = await requireSession()
  if (response) return response
  const userId = user!.id

  const rateKey = `me:export:${userId}`
  const existing = await redis.get<string>(rateKey)
  if (existing) {
    const ttl = await redis.ttl(rateKey)
    return NextResponse.json(
      { error: 'RATE_LIMITED', retryAfterSeconds: ttl > 0 ? ttl : RATE_TTL_SECONDS },
      { status: 429, headers: { 'Retry-After': String(ttl > 0 ? ttl : RATE_TTL_SECONDS) } },
    )
  }

  try {
    await redis.set(rateKey, '1', { ex: RATE_TTL_SECONDS })
    const bundle = await exportUserData(userId, user!.email ?? null)

    await auditLog({
      action: AUDIT_ACTIONS.USER_DATA_EXPORT,
      entityType: 'User',
      entityId: userId,
      userId,
      metadata: {
        leadsCount: bundle.leads.length,
        contentCount: bundle.contentPieces.length,
        themesCount: bundle.themes.length,
      },
    })

    const date = new Date().toISOString().slice(0, 10)
    const filename = `export-${userId}-${date}.json`
    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return internalError()
  }
}
