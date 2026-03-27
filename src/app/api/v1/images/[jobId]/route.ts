import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'

type Params = { params: Promise<{ jobId: string }> }

// GET /api/v1/images/[jobId]
export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { jobId } = await params

  try {
    const job = await prisma.imageJob.findUnique({ where: { id: jobId } })
    if (!job) return notFound('Job de imagem não encontrado')
    return ok(job)
  } catch {
    return internalError()
  }
}
