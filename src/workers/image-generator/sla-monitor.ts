// TASK-10 ST002 (CL-209): monitor que calcula p50/p95 do ImageJob na ultima
// hora e dispara alerta se p95 > 20s ou p50 > 15s. Dedup por hora.

import 'server-only'
import { prisma } from '@/lib/prisma'
import { sendAlertEmail } from '@/lib/alert-email'

const P50_THRESHOLD_MS = 15_000
const P95_THRESHOLD_MS = 20_000
const WINDOW_MS = 60 * 60 * 1000

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, idx)]
}

export interface SlaMonitorResult {
  sampleSize: number
  p50: number
  p95: number
  alerted: boolean
  dedupKey: string
}

export async function runImageSlaMonitor(now: Date = new Date()): Promise<SlaMonitorResult> {
  const since = new Date(now.getTime() - WINDOW_MS)
  const jobs = await prisma.imageJob.findMany({
    where: {
      status: 'DONE',
      createdAt: { gte: since },
      processingMs: { not: null },
    },
    select: { processingMs: true },
  })

  const durations = jobs
    .map((j) => j.processingMs ?? 0)
    .filter((n) => n > 0)
    .sort((a, b) => a - b)

  const p50 = percentile(durations, 50)
  const p95 = percentile(durations, 95)
  const hourBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}`
  const dedupKey = `IMAGE_SLA:${hourBucket}`

  const breached = durations.length >= 5 && (p95 > P95_THRESHOLD_MS || p50 > P50_THRESHOLD_MS)
  if (!breached) {
    return { sampleSize: durations.length, p50, p95, alerted: false, dedupKey }
  }

  // Dedup: nao alertar mais de uma vez na mesma hora
  const existing = await prisma.alertLog.findFirst({
    where: { type: 'IMAGE_SLA_VIOLATION', message: { contains: dedupKey } },
  })
  if (existing) {
    return { sampleSize: durations.length, p50, p95, alerted: false, dedupKey }
  }

  await sendAlertEmail({
    subject: `⚠ Image SLA violation — p95 ${Math.round(p95)}ms`,
    body: [
      `dedupKey: ${dedupKey}`,
      `Sample size: ${durations.length} jobs (ultima 1h)`,
      `p50: ${Math.round(p50)}ms (threshold ${P50_THRESHOLD_MS}ms)`,
      `p95: ${Math.round(p95)}ms (threshold ${P95_THRESHOLD_MS}ms)`,
    ].join('\n'),
    severity: 'WARNING',
    logType: 'IMAGE_SLA_VIOLATION',
    metadata: { p50, p95, sampleSize: durations.length, dedupKey },
  })

  return { sampleSize: durations.length, p50, p95, alerted: true, dedupKey }
}
