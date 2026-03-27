import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'

type Params = { params: Promise<{ id: string }> }

// DELETE /api/v1/assets/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const existing = await prisma.visualAsset.findUnique({ where: { id } })
    if (!existing) return notFound('Asset não encontrado')

    // TODO: Implementar via /auto-flow execute — remover do Supabase Storage
    await prisma.visualAsset.delete({ where: { id } })
    return ok({ message: 'Asset removido' })
  } catch {
    return internalError()
  }
}
