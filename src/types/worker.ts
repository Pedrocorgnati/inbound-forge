import { WorkerStatus, WorkerType } from './enums'

export interface WorkerHeartbeat {
  workerId: string
  type: WorkerType
  status: WorkerStatus
  lastPing: Date
  metadata?: {
    currentJob?: string
    queueDepth?: number
    errorCount?: number
  }
}
