// GAP: /api/v1/health/workers/route.ts não encontrado (module-6 endpoint ausente) — módulo 15 prosseguirá sem bloqueio
import { WorkerStatus } from '@/types/enums'

export interface OnboardingStep {
  id: number
  key: string
  title: string
  optional: boolean
}

export interface CredentialTestResult {
  service: string
  success: boolean
  latencyMs: number
  error?: string
}

export interface OnboardingState {
  currentStep: number
  completedSteps: number[]
  skippedSteps: number[]
  credentialResults: CredentialTestResult[]
  completedAt?: string // ISO 8601
}

// Re-export para que consumers do módulo possam importar de um só lugar
export type { WorkerStatus }
