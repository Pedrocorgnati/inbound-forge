// Module-11: Blog Article Versions — POST rollback para versão anterior
// Rastreabilidade: TASK-4 ST002, FEAT-publishing-blog-005
// Error Catalog: BLOG_001, BLOG_081, BLOG_082, SYS_001

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, notFound, badRequest, internalError } from '@/lib/api-auth'
import { blogVersionService } from '@/lib/services/blog-version.service'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const rollbackSchema = z.object({
  versionId: z.string().uuid('versionId deve ser um UUID válido'), // BLOG_082
  changeNote: z.string().max(500).optional(),
})

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { response } = await requireSession()
  if (response) return response // BLOG_001

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Body inválido')
  }

  const parsed = rollbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, errors: parsed.error.flatten().fieldErrors, code: 'BLOG_082' }, // BLOG_082
      { status: 400 },
    )
  }

  try {
    const result = await blogVersionService.rollback(
      id,
      parsed.data.versionId,
      parsed.data.changeNote,
    )
    return ok(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    if (message.includes('BLOG_081')) {
      return notFound('BLOG_081: Versão não encontrada ou não pertence a este artigo')
    }
    // SYS_001: Banco indisponível
    console.error('[POST /api/blog-articles/[id]/rollback] SYS_001:', err)
    return internalError('SYS_001: Erro ao realizar rollback. Tente novamente.')
  }
}
