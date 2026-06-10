// Inbound F1 — CRUD de broadcasts (protegido).
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, internalError, validationError } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CreateSchema = z.object({
  subject: z.string().trim().min(3).max(255),
  preheader: z.string().trim().max(255).optional(),
  bodyHtml: z.string().trim().min(10),
  bodyText: z.string().trim().optional(),
  fromName: z.string().trim().max(120).optional(),
  replyTo: z.string().trim().email().max(254).optional(),
  scheduledAt: z.string().datetime().optional(),
})

export async function GET() {
  const { user, response } = await requireSession()
  if (response || !user) return response ?? internalError()
  const broadcasts = await prisma.broadcast.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return ok(broadcasts)
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

  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null
  const created = await prisma.broadcast.create({
    data: {
      subject: parsed.data.subject,
      preheader: parsed.data.preheader ?? null,
      bodyHtml: parsed.data.bodyHtml,
      bodyText: parsed.data.bodyText ?? null,
      fromName: parsed.data.fromName ?? null,
      replyTo: parsed.data.replyTo ?? null,
      status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
      scheduledAt,
    },
  })
  return ok(created)
}
