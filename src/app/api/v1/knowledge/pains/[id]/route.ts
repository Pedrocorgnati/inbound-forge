import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { UpdatePainSchema } from '@/schemas/knowledge.schema'

type Params = { params: Promise<{ id: string }> }

// PUT /api/v1/knowledge/pains/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = UpdatePainSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const existing = await prisma.painLibraryEntry.findUnique({ where: { id } })
    if (!existing) return notFound('Dor não encontrada')

    const updated = await prisma.painLibraryEntry.update({ where: { id }, data: parsed.data })
    return ok(updated)
  } catch {
    return internalError()
  }
}
