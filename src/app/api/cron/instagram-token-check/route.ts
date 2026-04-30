/**
 * POST /api/cron/instagram-token-check — Cron diario de verificacao tiered
 * do token Instagram. Emite notificacao (log estruturado) UMA vez quando o
 * estado de severity escala (ex: passou de info para warning).
 *
 * TASK-13 ST006 (M11.7 / G-003) — debounce via app_settings
 * `instagram_token_last_alert_severity`. Idempotente por severity.
 *
 * Configurar em vercel.json:
 *   { "crons": [{ "path": "/api/cron/instagram-token-check", "schedule": "0 9 * * *" }] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTokenStatus } from '@/lib/instagram/token-manager'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SETTINGS_KEY = 'instagram_token_last_alert_severity'

async function readLastAlert(): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<Array<{ value: string }>>`
      SELECT value FROM app_settings WHERE key = ${SETTINGS_KEY} LIMIT 1
    `.catch(() => [])
    return Array.isArray(rows) && rows.length > 0 ? rows[0].value : null
  } catch {
    return null
  }
}

async function writeLastAlert(severity: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (${SETTINGS_KEY}, ${severity}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${severity}, updated_at = NOW()
    `
  } catch {
    // tabela ainda nao existe — ignorar
  }
}

const SEVERITY_RANK: Record<string, number> = { none: 0, info: 1, warning: 2, critical: 3 }

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env['CRON_SECRET']
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const status = await getTokenStatus()
    const current = status.severity
    const previous = (await readLastAlert()) ?? 'none'

    const escalated = (SEVERITY_RANK[current] ?? 0) > (SEVERITY_RANK[previous] ?? 0)
    const deescalated = (SEVERITY_RANK[current] ?? 0) < (SEVERITY_RANK[previous] ?? 0)

    if (escalated) {
      // Notificacao via log estruturado (Sentry captura via instrumentation).
      const logFn = current === 'critical' ? logger.error : logger.warn
      logFn('instagram-token-check', `Token severity escalated: ${previous} -> ${current}`, {
        daysUntilExpiry: status.daysUntilExpiry,
        isExpired: status.isExpired,
        severity: current,
        previousSeverity: previous,
      })
      await writeLastAlert(current)
      return NextResponse.json({
        success: true,
        notified: true,
        previous,
        current,
        daysUntilExpiry: status.daysUntilExpiry,
      })
    }

    if (deescalated) {
      // Provavelmente refresh aconteceu — atualiza marcador.
      await writeLastAlert(current)
    }

    return NextResponse.json({
      success: true,
      notified: false,
      previous,
      current,
      daysUntilExpiry: status.daysUntilExpiry,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    logger.error('instagram-token-check', `Falha no cron: ${message}`)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
