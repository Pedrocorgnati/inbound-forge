/**
 * GET/POST /api/v1/clusters — Intake Review TASK-8 ST005 (CL-159).
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'

const createSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/i, 'slug invalido (so letras, numeros e hifens)'),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
})

export async function GET() {
  const { response } = await requireSession()
  if (response) return response

  try {
    const clusters = await prisma.articleCluster.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { articles: true } } },
    })
    return ok(clusters)
  } catch (err) {
    console.error('[GET /api/v1/clusters]', err)
    return internalError()
  }
}

export async function POST(req: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return validationError('JSON invalido')
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const cluster = await prisma.articleCluster.create({
      data: {
        slug: parsed.data.slug.toLowerCase(),
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      },
    })
    return ok(cluster, 201)
  } catch (err) {
    console.error('[POST /api/v1/clusters]', err)
    return internalError()
  }
}
