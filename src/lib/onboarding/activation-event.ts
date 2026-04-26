import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// TASK-1 ST001 (CL-031): helper idempotente para registrar ActivationEvent
// Garante que apenas um evento por operator e gravado (unique constraint).
export interface RecordActivationInput {
  operatorId: string
  casesCount: number
  painsCount: number
  meta?: Record<string, unknown>
}

export interface RecordActivationResult {
  recorded: boolean
  eventId: string
}

export const ACTIVATION_THRESHOLD_CASES = 5
export const ACTIVATION_THRESHOLD_PAINS = 5

export function hasReachedActivationThreshold(cases: number, pains: number): boolean {
  return cases >= ACTIVATION_THRESHOLD_CASES && pains >= ACTIVATION_THRESHOLD_PAINS
}

export async function recordActivation(
  input: RecordActivationInput
): Promise<RecordActivationResult> {
  const existing = await prisma.activationEvent.findUnique({
    where: { operatorId: input.operatorId },
    select: { id: true },
  })
  if (existing) {
    return { recorded: false, eventId: existing.id }
  }

  const event = await prisma.activationEvent.create({
    data: {
      operatorId: input.operatorId,
      casesCount: input.casesCount,
      painsCount: input.painsCount,
      meta: input.meta ? (input.meta as Prisma.InputJsonValue) : Prisma.DbNull,
    },
    select: { id: true },
  })
  return { recorded: true, eventId: event.id }
}

export async function getActivationForOperator(operatorId: string) {
  return prisma.activationEvent.findUnique({ where: { operatorId } })
}
