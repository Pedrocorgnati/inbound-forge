// Video Worker Health — Heartbeat

import type { PrismaClient } from '@prisma/client'
import { VIDEO_WORKER_CONFIG } from './constants'

export function startHeartbeat(db: PrismaClient): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      await db.workerHealth.upsert({
        where:  { type: 'VIDEO' },
        create: {
          type:          'VIDEO',
          status:        'ACTIVE',
          lastHeartbeat: new Date(),
        },
        update: {
          status:        'ACTIVE',
          lastHeartbeat: new Date(),
        },
      })
    } catch (err) {
      process.stderr.write(JSON.stringify({ event: 'heartbeat_failed', error: String(err), timestamp: new Date().toISOString() }) + '\n')
    }
  }, VIDEO_WORKER_CONFIG.heartbeatIntervalMs)
}
