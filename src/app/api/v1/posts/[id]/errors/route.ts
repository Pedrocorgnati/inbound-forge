/**
 * TASK-5/ST002 — Historico de falhas de publicacao para o drawer (CL-198).
 */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, internalError } from '@/lib/api-auth'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params
  try {
    const errors = await prisma.postPublishError.findMany({
      where: { postId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return ok(errors)
  } catch {
    return internalError()
  }
}
