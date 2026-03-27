// module-9: Worker Health — Heartbeat CX-05
// Rastreabilidade: TASK-1 ST004, CX-05, INT-084, FEAT-creative-generation-004

import type { PrismaClient } from '@prisma/client'
import { IMAGE_WORKER_CONFIG } from './constants'
import type { CostLogEntry } from './types'

const costLog: CostLogEntry[] = []
let totalCostUsd = 0

export function recordCost(entry: CostLogEntry): void {
  costLog.push(entry)
  // Ring buffer — manter apenas os últimos N registros
  if (costLog.length > IMAGE_WORKER_CONFIG.costLogMaxEntries) {
    costLog.shift()
  }
  totalCostUsd += entry.costUsd
}

export function getCostLog(): CostLogEntry[] {
  return [...costLog]
}

export function getTotalCostUsd(): number {
  return totalCostUsd
}

export function startHeartbeat(db: PrismaClient): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadataPayload: any = {
        costLog:      costLog.slice(-10),
        totalCostUsd,
      }

      await db.workerHealth.upsert({
        where:  { type: 'IMAGE' },
        create: {
          type:          'IMAGE',
          status:        'ACTIVE',
          lastHeartbeat: new Date(),
          metadata:      metadataPayload,
        },
        update: {
          status:        'ACTIVE',
          lastHeartbeat: new Date(),
          metadata:      metadataPayload,
        },
      })
    } catch (err) {
      process.stderr.write(JSON.stringify({ event: 'heartbeat_failed', error: String(err), timestamp: new Date().toISOString() }) + '\n')
    }
  }, IMAGE_WORKER_CONFIG.heartbeatIntervalMs)
}
