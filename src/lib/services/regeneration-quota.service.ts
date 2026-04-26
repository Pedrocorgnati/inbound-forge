/**
 * TASK-6 (CL-190) — Quota de regeneracoes por tema.
 */
import { prisma } from '@/lib/prisma'

export const REGEN_SOFT_THRESHOLD = Number(process.env.REGEN_SOFT_THRESHOLD ?? 3)
export const REGEN_HARD_CAP = Number(process.env.REGEN_HARD_CAP ?? 5)

export class RegenerationQuotaError extends Error {
  code = 'REGEN_CAP_REACHED'
  statusCode = 429
  constructor(public count: number, public cap: number) {
    super(`Regeneration cap reached (${count}/${cap})`)
  }
}

export async function getRegenerationCount(themeId: string): Promise<number> {
  const theme = await prisma.theme.findUnique({
    where: { id: themeId },
    select: { regenerationCount: true },
  })
  return theme?.regenerationCount ?? 0
}

export async function assertCanRegenerate(themeId: string): Promise<number> {
  const count = await getRegenerationCount(themeId)
  if (count >= REGEN_HARD_CAP) {
    throw new RegenerationQuotaError(count, REGEN_HARD_CAP)
  }
  return count
}

export async function incrementRegenerationCount(themeId: string): Promise<number> {
  const updated = await prisma.theme.update({
    where: { id: themeId },
    data: { regenerationCount: { increment: 1 } },
    select: { regenerationCount: true },
  })
  return updated.regenerationCount
}

export function regenerationHeaders(count: number) {
  return {
    'X-Regen-Count': String(count),
    'X-Regen-Cap': String(REGEN_HARD_CAP),
    'X-Regen-Soft': String(REGEN_SOFT_THRESHOLD),
  }
}
