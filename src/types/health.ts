import { WorkerStatus, WorkerType } from '@/types/enums'

export interface HealthCardData {
  service: string
  workerType: WorkerType
  status: WorkerStatus
  lastCheck: string // ISO 8601
  latencyMs: number
  errorMessage?: string
}

export interface ApiUsageData {
  service: string
  usedTokens: number
  limitTokens: number
  costUSD: number
  resetAt: string // ISO 8601
  percentUsed: number // 0-100, calculado no consumer
}

export interface AlertLogEntry {
  id: string
  service: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  occurredAt: string // ISO 8601
  resolved: boolean
}

export type HealthStatus = 'ok' | 'degraded' | 'down'

export interface HealthDetailedResponse {
  status: HealthStatus
  version: string
  timestamp: string
  workers: HealthCardData[]
  recentAlerts: AlertLogEntry[]
}
