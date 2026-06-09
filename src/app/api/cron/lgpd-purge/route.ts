/**
 * Intake-Review TASK-1 ST002 (CL-TA-036/CL-OP-018/CL-TH-031): cron LGPD
 * diario 02:00 UTC (agendado em vercel.json). Protegido por Bearer
 * CRON_SECRET (mesmo pattern dos demais crons — ga4-sync, worker-silence).
 *
 * Conformidade: LGPD art. 16 (eliminacao). Em caso de erro, reporta ao
 * Sentry e retorna 500 para que o Vercel Cron registre a falha e
 * triggereie o alerta configurado.
 */
import { NextRequest, NextResponse } from 'next/server'
import { purgeExpiredLeads } from '@/lib/services/lgpd-purge.service'
import { runRetentionCleanup } from '@/lib/lgpd/retention'
import { prisma } from '@/lib/prisma'
import { captureException } from '@/lib/sentry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // CP-COMP-01 / DB-04: runRetentionCleanup (anonimiza contactInfo de leads
    // >2 anos, nulifica DiagnosticoLead.rawText vencido, purga
    // ScrapedText/AlertLog/ApiUsageLog por TTL) PRECISA rodar ANTES do hard
    // delete — antes nao tinha caller, entao leads nunca eram anonimizados e o
    // gate `contactInfo:null` de purgeExpiredLeads nunca casava.
    const retention = await runRetentionCleanup(prisma)
    const result = await purgeExpiredLeads()
    return NextResponse.json({
      ok: true,
      retention: retention.deleted,
      ...result,
      runAt: new Date().toISOString(),
    })
  } catch (err) {
    captureException(err, { scope: 'cron.lgpd-purge' })
    console.error('[cron.lgpd-purge]', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}
