// TASK-9 (CL-288): listagem paginada de ScrapingAuditLog com filtros.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { requireSession, okPaginated, internalError, validationError } from '@/lib/api-auth'

// fix REPROVADO (finding TASK-013): filtros validados via Zod (espelha a rota de
// export). Antes `status` era um cast sem validacao (ex: ?status=UNKNOWN chegava
// como string nao-tipada ao Prisma) e `from`/`to` viravam `new Date('lixo')` =
// Invalid Date silencioso. Agora input invalido retorna 422 tipado (Zero Silencio).
const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['SUCCESS', 'PARTIAL', 'FAILED']).optional(),
  sourceId: z.string().trim().min(1).optional(),
  // aceita qualquer string que o JS parseie como data real; rejeita lixo (NaN).
  from: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'from deve ser uma data valida')
    .optional(),
  to: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'to deve ser uma data valida')
    .optional(),
})

export async function GET(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  const parsed = QuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  )
  if (!parsed.success) return validationError(parsed.error)
  const { page, limit, status, sourceId, from, to } = parsed.data

  try {
    // Isolamento multi-tenant (finding TASK-013): so logs de fontes do operador logado.
    // ScrapingAuditLog nao tem operatorId proprio; scoping via relacao source.operatorId.
    const where: Prisma.ScrapingAuditLogWhereInput = {
      source: { operatorId: user!.id },
    }
    if (status) where.status = status
    if (sourceId) where.sourceId = sourceId
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }

    const [data, total] = await Promise.all([
      prisma.scrapingAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { source: { select: { id: true, name: true } } },
      }),
      prisma.scrapingAuditLog.count({ where }),
    ])

    return okPaginated(data, { page, limit, total })
  } catch {
    return internalError()
  }
}
