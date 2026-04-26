// worker-log-aggregator — agrega logs de AuditLog + AlertLog (+ Railway futuramente)
// TASK-7 ST004 / CL-254. Max 200 linhas por request, ordenado por timestamp desc.

import { prisma } from '@/lib/prisma'
import { sanitizeForLog } from '@/lib/log-sanitizer'

const WINDOW_MS = 15 * 60 * 1000
const MAX_ROWS = 200

export type LogSource = 'audit' | 'alert'
export type LogSeverity = 'info' | 'warn' | 'error'

export interface AggregatedLogEntry {
  id: string
  source: LogSource
  severity: LogSeverity
  message: string
  createdAt: string
  worker: string
  metadata?: unknown
}

function workerFromAction(action: string, entityType: string): string | null {
  const a = action.toUpperCase()
  if (a.startsWith('SCRAPING')) return 'scraping'
  if (a.startsWith('IMAGE') || a.includes('IMAGE_WORKER')) return 'image'
  if (a.startsWith('VIDEO') || a.includes('VIDEO_WORKER')) return 'video'
  if (a.startsWith('PUBLISH') || a.includes('PUBLISHING') || a.includes('INSTAGRAM')) return 'publishing'
  if (a === 'WORKER_RESTART' || a === 'WORKER_TRIGGER') return null // will use metadata.worker/entityId
  if (entityType === 'Worker') return null
  return null
}

export async function getWorkerLogs(
  worker: string,
  sinceIso: string | null,
): Promise<AggregatedLogEntry[]> {
  const since = sinceIso ? new Date(sinceIso) : new Date(Date.now() - WINDOW_MS)

  const [audits, alerts] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        createdAt: { gt: since },
        OR: [
          { action: { contains: worker.toUpperCase(), mode: 'insensitive' } },
          { entityId: worker },
          { entityType: 'Worker', entityId: worker },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS,
    }),
    prisma.alertLog.findMany({
      where: {
        createdAt: { gt: since },
        message: { contains: worker, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS,
    }),
  ])

  const entries: AggregatedLogEntry[] = []

  for (const row of audits) {
    const inferred = workerFromAction(row.action, row.entityType) ?? worker
    if (inferred !== worker && row.entityId !== worker) continue
    entries.push({
      id: `audit:${row.id}`,
      source: 'audit',
      severity: 'info',
      message: row.action,
      createdAt: row.createdAt.toISOString(),
      worker,
      metadata: sanitizeForLog(row.metadata ?? null),
    })
  }

  for (const row of alerts) {
    entries.push({
      id: `alert:${row.id}`,
      source: 'alert',
      severity: (row.severity.toLowerCase() === 'error' ? 'error' : 'warn') as LogSeverity,
      message: row.message,
      createdAt: row.createdAt.toISOString(),
      worker,
      metadata: { type: row.type, resolved: row.resolved },
    })
  }

  entries.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
  return entries.slice(0, MAX_ROWS)
}
