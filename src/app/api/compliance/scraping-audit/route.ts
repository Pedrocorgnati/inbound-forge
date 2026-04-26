/**
 * GET /api/compliance/scraping-audit
 * TASK-1 ST004 + TASK-3 ST004 / module-6-scraping-worker
 *
 * Modo 1 (padrão): relatório agregado LGPD (startDate/endDate)
 * Modo 2 (?mode=logs): lista paginada de ScrapingAuditLog dedicado (CL-147)
 * AUTH_001: JWT obrigatório.
 * DEGRADED: cache Redis 5min para queries pesadas.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { redis } from '@/lib/redis'
import { getScrapingAuditReport } from '@/lib/services/lgpd-compliance.service'
import { listScrapingAuditLogs } from '@/lib/compliance/scraping-audit-log'

const CACHE_TTL = 5 * 60 // 5 minutos
const CACHE_KEY = 'cache:compliance:scraping-audit'
const QUERY_TIMEOUT_MS = 10_000

export async function GET(request: NextRequest) {
  const { response: authError } = await requireSession()
  if (authError) return authError

  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('mode') // 'logs' = lista paginada de ScrapingAuditLog

  // Modo 2: lista paginada do ScrapingAuditLog dedicado (CL-147)
  if (mode === 'logs') {
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)
    const sourceId = searchParams.get('sourceId') ?? undefined

    try {
      const result = await listScrapingAuditLogs({ page, limit, sourceId })
      return ok(result)
    } catch (err) {
      console.error('[ScrapingAudit] Logs query error', err instanceof Error ? err.message : 'unknown')
      return internalError()
    }
  }

  // Modo 1 (padrão): relatório agregado com cache Redis
  const startDateStr = searchParams.get('startDate')
  const endDateStr = searchParams.get('endDate')

  // Default: últimos 30 dias
  const endDate = endDateStr ? new Date(endDateStr) : new Date()
  const startDate = startDateStr
    ? new Date(startDateStr)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

  const cacheKey = `${CACHE_KEY}:${startDate.toISOString()}:${endDate.toISOString()}`

  // DEGRADED: tentar cache Redis primeiro
  try {
    const cached = await redis.get<string>(cacheKey)
    if (cached) {
      return NextResponse.json(
        { success: true, data: JSON.parse(cached) },
        {
          status: 200,
          headers: { 'Cache-Control': `max-age=${CACHE_TTL}`, 'Retry-After': String(CACHE_TTL) },
        }
      )
    }
  } catch {
    // Cache indisponível — continuar com query direta
  }

  // Query com timeout hard de 10s
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('QUERY_TIMEOUT')), QUERY_TIMEOUT_MS)
  )

  try {
    const report = await Promise.race([
      getScrapingAuditReport(startDate, endDate),
      timeoutPromise,
    ])

    // Gravar no cache Redis
    try {
      await redis.set(cacheKey, JSON.stringify(report), { ex: CACHE_TTL })
    } catch {
      // Falha de cache não afeta a resposta
    }

    return ok(report)
  } catch (err) {
    if (err instanceof Error && err.message === 'QUERY_TIMEOUT') {
      return NextResponse.json(
        { success: false, code: 'SYS_002', error: 'Serviço temporariamente indisponível.' },
        { status: 503, headers: { 'Retry-After': '30' } }
      )
    }

    console.error('[ScrapingAudit] Error', err instanceof Error ? err.message : 'unknown')
    return internalError()
  }
}
