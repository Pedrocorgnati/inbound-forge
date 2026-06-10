// Inbound F5 — CRUD de regras de automacao (protegido).
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, internalError, validationError } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  enabled: z.boolean().default(true),
  trigger: z.enum(['LEAD_CREATED', 'LEAD_STATUS_CHANGED', 'LEAD_MQL']),
  actionType: z.enum(['NOTIFY', 'SET_FUNNEL_STAGE', 'ENROLL_SEQUENCE']),
  actionConfig: z
    .object({
      funnelStage: z.enum(['AWARENESS', 'CONSIDERATION', 'DECISION']).optional(),
      sequenceId: z.string().optional(),
      note: z.string().max(500).optional(),
    })
    .optional(),
})

export async function GET() {
  const { user, response } = await requireSession()
  if (response || !user) return response ?? internalError()
  const rules = await prisma.automationRule.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { _count: { select: { runs: true } } },
  })
  return ok(rules)
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response || !user) return response ?? internalError()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body invalido'))
  }
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  // Validacao de coerencia acao<->config
  const cfg = parsed.data.actionConfig ?? {}
  if (parsed.data.actionType === 'SET_FUNNEL_STAGE' && !cfg.funnelStage) {
    return validationError(new Error('SET_FUNNEL_STAGE exige actionConfig.funnelStage'))
  }
  if (parsed.data.actionType === 'ENROLL_SEQUENCE' && !cfg.sequenceId) {
    return validationError(new Error('ENROLL_SEQUENCE exige actionConfig.sequenceId'))
  }

  const created = await prisma.automationRule.create({
    data: {
      name: parsed.data.name,
      enabled: parsed.data.enabled,
      trigger: parsed.data.trigger,
      actionType: parsed.data.actionType,
      actionConfig: parsed.data.actionConfig ?? undefined,
    },
  })
  return ok(created)
}
