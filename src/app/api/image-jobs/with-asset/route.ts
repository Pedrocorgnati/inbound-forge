/**
 * POST /api/image-jobs/with-asset — Gerar imagem usando asset do operador como background
 *
 * Módulo: module-10-asset-library (TASK-2 ST001)
 * Rastreabilidade: INT-062, INT-063, FEAT-creative-generation-009
 * Error Catalog:
 *   IMAGE_080 (404) — asset não encontrado
 *   IMAGE_051 (409) — job duplicado (ContentPiece já tem job ativo)
 *   VAL_001  (400) — campo obrigatório ausente
 *   VAL_002  (400) — assetId com formato inválido
 *   SYS_001  (500) — falha na composição
 *   AUTH_001 (401) — sessão expirada
 *
 * Modo síncrono — sem Redis queue.
 * Tempo médio: < 3s.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z }                          from 'zod'
import { requireSession }             from '@/lib/api-auth'
import { prisma }                     from '@/lib/prisma'
import { assetComposeService }        from '@/lib/services/asset-compose.service'

// ─── Validation ───────────────────────────────────────────────────────────────

const WithAssetSchema = z.object({
  contentPieceId: z.string().uuid({ message: 'contentPieceId deve ser UUID válido.' }),
  templateId:     z.string().uuid({ message: 'templateId deve ser UUID válido.' }),
  assetId:        z.string().uuid({ message: 'ID de asset inválido.' }),          // VAL_002
  templateProps:  z.record(z.unknown()).optional().default({}),                    // Props dinâmicas para o template
})

// ─── POST /api/image-jobs/with-asset ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'VAL_001', message: 'Corpo JSON inválido.' } },
      { status: 400 }
    )
  }

  const parsed = WithAssetSchema.safeParse(body)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    const code = firstIssue.path.includes('assetId') ? 'VAL_002' : 'VAL_001'
    return NextResponse.json(
      { error: { code, message: firstIssue.message } },
      { status: 400 }
    )
  }

  const { contentPieceId, templateId, assetId, templateProps } = parsed.data

  // Verificar ContentPiece existe
  const piece = await prisma.contentPiece.findUnique({ where: { id: contentPieceId } })
  if (!piece) {
    return NextResponse.json(
      { error: { code: 'VAL_001', message: 'ContentPiece não encontrado.' } },
      { status: 404 }
    )
  }

  // IMAGE_051 — verificar job duplicado (PENDING ou PROCESSING)
  const existingJob = await prisma.imageJob.findFirst({
    where: {
      contentPieceId,
      status: { in: ['PENDING', 'PROCESSING'] },
    },
  })
  if (existingJob) {
    return NextResponse.json(
      { error: { code: 'IMAGE_051', message: 'Já existe um job de geração de imagem em andamento para este conteúdo.' } },
      { status: 409 }
    )
  }

  // Buscar template para obter templateType
  const template = await prisma.imageTemplate.findUnique({ where: { id: templateId } })
  if (!template) {
    return NextResponse.json(
      { error: { code: 'VAL_001', message: 'Template não encontrado.' } },
      { status: 404 }
    )
  }

  // Criar ImageJob com status PROCESSING
  const job = await prisma.imageJob.create({
    data: {
      contentPieceId,
      templateId,
      templateType: template.imageType,
      provider:     'operator-asset',
      status:       'PROCESSING',
      retryCount:   0,
    },
  })

  // Executar composição síncrona
  try {
    const result = await assetComposeService.composeWithAsset({
      jobId:         job.id,
      templateType:  template.templateType as Parameters<typeof assetComposeService.composeWithAsset>[0]['templateType'],
      templateProps,
      assetId,
    })

    const response: { jobId: string; warning?: string } = { jobId: job.id }
    if (result.warning) {
      response.warning = result.warning
    }

    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    // Atualizar job para FAILED
    await prisma.imageJob.update({
      where: { id: job.id },
      data:  {
        status:       'FAILED',
        errorMessage: err instanceof Error ? err.message : 'Erro desconhecido',
        completedAt:  new Date(),
      },
    }).catch((updateErr) => {
      console.error('[POST /api/image-jobs/with-asset] Falha ao atualizar job para FAILED:', updateErr)
    })

    const code = (err as NodeJS.ErrnoException).code
    if (code === 'IMAGE_080') {
      return NextResponse.json(
        { error: { code: 'IMAGE_080', message: 'Asset não encontrado.' } },
        { status: 404 }
      )
    }

    console.error('[POST /api/image-jobs/with-asset] Erro na composição:', err)
    return NextResponse.json(
      { error: { code: 'SYS_001', message: 'Erro ao gerar imagem. Tente novamente.' } },
      { status: 500 }
    )
  }
}
