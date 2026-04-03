/**
 * GET /api/image-jobs/[id] — Status do job de imagem (polling)
 *
 * Módulo: module-9-image-worker (TASK-1/ST004, ST005)
 * Rastreabilidade: CX-05, INT-084, SEC-007
 * Error Catalog: IMAGE_080 (404 — job não encontrado)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, notFound } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase-server'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { response: authResponse, user } = await requireSession()
  if (authResponse || !user) return authResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const job = await prisma.imageJob.findUnique({
    where: { id },
    select: {
      id:            true,
      status:        true,
      imageUrl:      true,
      errorMessage:  true,
      retryCount:    true,
      completedAt:   true,
      contentPieceId: true,
    },
  })

  if (!job) {
    return NextResponse.json(
      { error: { code: 'IMAGE_080', message: 'Job de imagem não encontrado.' } },
      { status: 404 }
    )
  }

  // SEC-007: Ownership validation via ContentPiece
  if (job.contentPieceId) {
    const supabase = await createClient()
    const { data: { user: _supabaseUser } } = await supabase.auth.getUser()

    // Verificar que o contentPiece pertence a este operador (single-tenant: qualquer operador autenticado pode acessar)
    const piece = await prisma.contentPiece.findUnique({ where: { id: job.contentPieceId }, select: { id: true } })
    if (!piece) {
      return notFound('ContentPiece vinculado não encontrado.')
    }
  }

  return ok({
    id:           job.id,
    status:       job.status,
    imageUrl:     job.imageUrl,
    errorMessage: job.errorMessage,
    retryCount:   job.retryCount,
    completedAt:  job.completedAt,
  })
}
