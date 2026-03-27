import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/v1/knowledge/cases/[id]/validate
export async function PATCH(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const existing = await prisma.caseLibraryEntry.findUnique({ where: { id } })
    if (!existing) return notFound('Case não encontrado')

    const updated = await prisma.caseLibraryEntry.update({
      where: { id },
      data: { status: 'VALIDATED' },
    })
    return ok(updated)
  } catch {
    return internalError()
  }
}
