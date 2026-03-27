import { z } from 'zod'
import { WorkerType, WorkerStatus } from '../enums'

export const WorkerHeartbeatSchema = z.object({
  workerId: z.string().min(1),
  type: z.nativeEnum(WorkerType),
  status: z.nativeEnum(WorkerStatus),
  metadata: z
    .object({
      currentJob: z.string().optional(),
      queueDepth: z.number().int().min(0).optional(),
      errorCount: z.number().int().min(0).optional(),
    })
    .optional(),
})

export type WorkerHeartbeatInput = z.infer<typeof WorkerHeartbeatSchema>
