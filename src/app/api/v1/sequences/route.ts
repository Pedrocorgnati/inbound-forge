// Inbound F4 — CRUD de nurture sequences (protegido). Cria sequence + steps juntos.
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, internalError, validationError } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const StepSchema = z.object({
  delayHours: z.number().int().min(0).max(8760),
  subject: z.string().trim().min(3).max(255),
  bodyHtml: z.string().trim().min(10),
})

const CreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  autoEnroll: z.boolean().default(true),
  steps: z.array(StepSchema).min(1).max(20),
})

export async function GET() {
  const { user, response } = await requireSession()
  if (response || !user) return response ?? internalError()
  const sequences = await prisma.nurtureSequence.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { steps: { orderBy: { order: 'asc' } }, _count: { select: { enrollments: true } } },
  })
  return ok(sequences)
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

  const created = await prisma.nurtureSequence.create({
    data: {
      name: parsed.data.name,
      status: parsed.data.status,
      autoEnroll: parsed.data.autoEnroll,
      steps: {
        create: parsed.data.steps.map((s, i) => ({
          order: i,
          delayHours: s.delayHours,
          subject: s.subject,
          bodyHtml: s.bodyHtml,
        })),
      },
    },
    include: { steps: { orderBy: { order: 'asc' } } },
  })
  return ok(created)
}
