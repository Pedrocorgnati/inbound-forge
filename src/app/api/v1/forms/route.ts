// Inbound F2 — CRUD de lead forms (protegido).
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, internalError, validationError } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,118}$/

const CreateSchema = z.object({
  slug: z.string().trim().regex(SLUG_RE, 'Slug invalido (a-z, 0-9, hifen)'),
  name: z.string().trim().min(2).max(160),
  kind: z.enum(['NEWSLETTER', 'GATED_DOWNLOAD', 'DEMO_REQUEST', 'GENERIC']).default('NEWSLETTER'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  headline: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  ctaLabel: z.string().trim().max(80).optional(),
  successMessage: z.string().trim().max(2000).optional(),
  lgpdConsentText: z.string().trim().max(2000).optional(),
})

export async function GET() {
  const { user, response } = await requireSession()
  if (response || !user) return response ?? internalError()
  const forms = await prisma.leadForm.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  return ok(forms)
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

  const dup = await prisma.leadForm.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } })
  if (dup) return validationError(new Error('Slug ja existe'))

  const created = await prisma.leadForm.create({
    data: {
      slug: parsed.data.slug,
      name: parsed.data.name,
      kind: parsed.data.kind,
      status: parsed.data.status,
      headline: parsed.data.headline ?? null,
      description: parsed.data.description ?? null,
      ctaLabel: parsed.data.ctaLabel ?? null,
      successMessage: parsed.data.successMessage ?? null,
      lgpdConsentText: parsed.data.lgpdConsentText ?? null,
    },
  })
  return ok(created)
}
