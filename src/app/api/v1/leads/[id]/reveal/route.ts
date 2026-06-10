/**
 * POST /api/v1/leads/[id]/reveal — TAREFA-002 (P0)
 *
 * Revela a PII (contactInfo) de um lead EXIGINDO motivo + ciencia LGPD.
 * Contrato critico: o registro PIIRevealAudit (revealedBy, motivo, ttlExpiresAt,
 * correlationId) e persistido ANTES de descriptografar/retornar a PII. Se o
 * audit falhar, a PII NUNCA e revelada (Zero Silencio).
 *
 * SEC-008: o valor revelado nunca e logado nem incluido em metadata de audit.
 */
import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  requireSession,
  ok,
  notFound,
  badRequest,
  validationError,
  internalError,
} from '@/lib/api-auth'
import { decryptPII } from '@/lib/crypto'
import { auditLog } from '@/lib/audit'
import { recordPIIReveal, getPIIRevealTtlMs } from '@/lib/pii/audit-log'
import { withIdempotency } from '@/lib/idempotency/middleware'

type Params = { params: Promise<{ id: string }> }

const RevealSchema = z.object({
  // Modal exige textarea com no minimo 12 chars (criterio de aceite).
  motivo: z.string().trim().min(12, 'O motivo deve ter ao menos 12 caracteres.'),
  // Checkbox de ciencia LGPD obrigatorio.
  lgpdAck: z.literal(true, {
    errorMap: () => ({ message: 'E necessario confirmar a ciencia LGPD.' }),
  }),
})

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response || !user) return response ?? internalError()

  const { id } = await params

  return withIdempotency(request, {
    userId: user.id,
    handler: async () => {
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return validationError(new Error('Body inválido'))
      }

      const parsed = RevealSchema.safeParse(body)
      if (!parsed.success) return validationError(parsed.error)

      try {
        const lead = await prisma.lead.findUnique({
          where: { id },
          select: { id: true, contactInfo: true, channel: true },
        })
        if (!lead) return notFound('Lead não encontrado')
        if (!lead.contactInfo) {
          return badRequest('Este lead não possui contato cadastrado.')
        }

        const correlationId = randomUUID()
        const ttlMs = getPIIRevealTtlMs()
        const ttlExpiresAt = new Date(Date.now() + ttlMs)

        // PASSO CRITICO: persistir o audit ANTES de revelar. Falha aqui aborta
        // a revelacao com erro tipado (LGPD, COMP-001).
        try {
          await recordPIIReveal({
            leadId: id,
            revealedBy: user.id,
            motivo: parsed.data.motivo,
            correlationId,
            ttlExpiresAt,
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'unknown'
          console.error(`[TAREFA-002] PIIRevealAudit insert failed (corr=${correlationId}):`, msg)
          return internalError('Falha ao registrar a auditoria de revelação. Tente novamente.')
        }

        // Audit catalogo geral (COMP-001) — SEC-008: sem o valor revelado.
        void auditLog({
          action: 'lead.contact_revealed',
          entityType: 'Lead',
          entityId: id,
          userId: user.id,
          leadId: id,
          metadata: { channel: lead.channel, correlationId, ttlMs },
        })

        let contactInfo: string
        try {
          contactInfo = decryptPII(lead.contactInfo)
        } catch {
          return internalError('Não foi possível descriptografar o contato.')
        }

        return ok({
          contactInfo,
          correlationId,
          ttlExpiresAt: ttlExpiresAt.toISOString(),
          ttlMs,
        })
      } catch {
        return internalError()
      }
    },
  })
}
