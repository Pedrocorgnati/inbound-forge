/**
 * Single-User Guard — TASK-12 ST004 (CL-007)
 *
 * O Inbound Forge e explicitamente single-user (um unico Operator por instancia).
 * Este guard impede a criacao de um segundo Operator, tanto no signup quanto
 * em scripts administrativos.
 *
 * Nota de schema: nao usamos constraint DB nivel coluna (Postgres nao oferece
 * "unique singleton" nativo sem trigger). A garantia e aplicada via:
 *   1. Este guard no caminho de signup (preferencial).
 *   2. Trigger SQL opcional — ver `docs/security/single-user-trigger.sql`.
 */
import { prisma } from '@/lib/prisma'

export class SingleUserViolation extends Error {
  readonly code = 'SINGLE_USER_VIOLATION'
  readonly httpStatus = 409
  constructor(message = 'Inbound Forge e single-user: ja existe um Operator cadastrado.') {
    super(message)
    this.name = 'SingleUserViolation'
  }
}

/**
 * Lanca SingleUserViolation quando ja existe Operator cadastrado.
 * Use SEMPRE antes de criar um novo Operator.
 */
export async function assertSingleOperator(): Promise<void> {
  const count = await prisma.operator.count()
  if (count >= 1) {
    throw new SingleUserViolation()
  }
}

/**
 * Variante defensiva para chamadas em contextos onde throw e inconveniente.
 * Retorna `{ ok: true }` quando seguro criar, `{ ok: false, reason }` quando bloqueado.
 */
export async function checkSingleOperator(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const count = await prisma.operator.count()
  if (count >= 1) {
    return { ok: false, reason: 'operator-exists' }
  }
  return { ok: true }
}
