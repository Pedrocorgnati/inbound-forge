/**
 * TAREFA-002 (P0) — PII Reveal Audit (LGPD)
 *
 * Persistencia da trilha de auditoria de revelacao de PII.
 * Contrato: o registro DEVE ser gravado ANTES de qualquer PII ser retornada
 * ao cliente (POST /api/v1/leads/[id]/reveal). Se a gravacao falhar, a PII
 * NUNCA e revelada (Zero Silencio: o caller retorna erro tipado).
 *
 * SEC-008: este modulo nunca recebe nem armazena o valor revelado — apenas o
 * motivo declarado pelo operador.
 */
import { prisma } from '@/lib/prisma'

/** TTL default de revelacao no front (5 minutos). Override por env. */
export const DEFAULT_PII_REVEAL_TTL_MS = 5 * 60 * 1000

/**
 * Resolve o TTL de revelacao (ms) a partir de PII_REVEAL_TTL_MS.
 * Valor invalido/ausente cai no default de 5 minutos (Zero Estados Indefinidos).
 */
export function getPIIRevealTtlMs(): number {
  const raw = process.env.PII_REVEAL_TTL_MS
  if (!raw) return DEFAULT_PII_REVEAL_TTL_MS
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PII_REVEAL_TTL_MS
  return parsed
}

export interface RecordPIIRevealInput {
  leadId: string
  revealedBy: string
  motivo: string
  correlationId: string
  ttlExpiresAt: Date
}

export interface PIIRevealRecord {
  id: string
  correlationId: string
  ttlExpiresAt: Date
}

/**
 * Grava o registro de revelacao de PII.
 * Diferente de auditLog() (fire-and-forget), aqui a falha PROPAGA: o caller
 * deve abortar a revelacao se o audit nao foi persistido (LGPD, COMP-001).
 */
export async function recordPIIReveal(
  input: RecordPIIRevealInput,
): Promise<PIIRevealRecord> {
  const audit = await prisma.pIIRevealAudit.create({
    data: {
      leadId: input.leadId,
      revealedBy: input.revealedBy,
      motivo: input.motivo,
      correlationId: input.correlationId,
      ttlExpiresAt: input.ttlExpiresAt,
    },
    select: { id: true, correlationId: true, ttlExpiresAt: true },
  })
  return audit
}

/**
 * Lista as revelacoes de PII de um lead (mais recentes primeiro).
 * Consumido por /compliance/scraping-audit (TAREFA-014). Nunca expoe PII.
 */
export async function listPIIReveals(leadId: string, take = 50) {
  return prisma.pIIRevealAudit.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      revealedBy: true,
      motivo: true,
      correlationId: true,
      ttlExpiresAt: true,
      createdAt: true,
    },
  })
}
