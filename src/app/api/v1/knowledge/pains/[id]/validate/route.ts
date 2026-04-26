import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { KNOWLEDGE_STATUS } from '@/constants/status'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/v1/knowledge/pains/[id]/validate
export async function PATCH(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const existing = await prisma.painLibraryEntry.findUnique({ where: { id } })
    if (!existing) return notFound('Dor não encontrada')

    const updated = await prisma.painLibraryEntry.update({ where: { id }, data: { status: KNOWLEDGE_STATUS.VALIDATED } })
    return ok(updated)
  } catch {
    return internalError()
  }
}
