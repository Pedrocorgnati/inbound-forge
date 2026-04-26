/**
 * Delta computation — Intake-Review TASK-1 ST006
 * Extraido de auditLog.ts para permitir unit test sem dependencia de Prisma.
 */

/**
 * Compara antes/depois e retorna apenas campos modificados.
 * Nao inclui campos automaticos (updatedAt, createdAt, id).
 */
export function computeDelta<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): Record<string, { from: unknown; to: unknown }> {
  const delta: Record<string, { from: unknown; to: unknown }> = {}
  const skip = new Set(['updatedAt', 'createdAt', 'id'])

  for (const key of Object.keys(after)) {
    if (skip.has(key)) continue
    const next = (after as Record<string, unknown>)[key]
    const prev = (before as Record<string, unknown>)[key]
    const same =
      prev === next ||
      (prev instanceof Date && next instanceof Date && prev.getTime() === next.getTime()) ||
      JSON.stringify(prev) === JSON.stringify(next)
    if (!same) {
      delta[key] = { from: prev as unknown, to: next as unknown }
    }
  }

  return delta
}
