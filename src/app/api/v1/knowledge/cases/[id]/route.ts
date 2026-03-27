import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { UpdateCaseSchema } from '@/schemas/knowledge.schema'

type Params = { params: Promise<{ id: string }> }

// PUT /api/v1/knowledge/cases/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }

  const parsed = UpdateCaseSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const existing = await prisma.caseLibraryEntry.findUnique({ where: { id } })
    if (!existing) return notFound('Case não encontrado')

    const updated = await prisma.caseLibraryEntry.update({ where: { id }, data: parsed.data })
    return ok(updated)
  } catch {
    return internalError()
  }
}

// DELETE /api/v1/knowledge/cases/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const existing = await prisma.caseLibraryEntry.findUnique({ where: { id } })
    if (!existing) return notFound('Case não encontrado')

    await prisma.caseLibraryEntry.delete({ where: { id } })
    return ok({ message: 'Case removido' })
  } catch {
    return internalError()
  }
}
