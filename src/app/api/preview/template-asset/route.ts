/**
 * POST /api/preview/template-asset — Preview de template + asset (sem criar job)
 *
 * Módulo: module-10-asset-library (TASK-2 ST001)
 * Rastreabilidade: INT-063, FEAT-creative-generation-009
 * Retorna: imagem base64 para preview inline (sem salvar no banco)
 * Tempo alvo: < 3s
 */

import { NextRequest, NextResponse } from 'next/server'
import { z }                          from 'zod'
import { requireSession }             from '@/lib/api-auth'
import { assetComposeService }        from '@/lib/services/asset-compose.service'

// ─── Validation ───────────────────────────────────────────────────────────────

const PreviewSchema = z.object({
  templateType: z.enum([
    'CAROUSEL', 'STATIC_LANDSCAPE', 'STATIC_PORTRAIT',
    'VIDEO_COVER', 'BEFORE_AFTER', 'ERROR_CARD', 'SOLUTION_CARD', 'BACKSTAGE_CARD',
  ]),
  props:   z.record(z.unknown()).optional().default({}),
  assetId: z.string().min(1, { message: 'Campo "assetId" ausente.' }),
})

// ─── POST /api/preview/template-asset ────────────────────────────────────────

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

  const parsed = PreviewSchema.safeParse(body)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return NextResponse.json(
      { error: { code: 'VAL_001', message: firstIssue.message } },
      { status: 400 }
    )
  }

  const { templateType, props, assetId } = parsed.data

  try {
    const { buffer, mimeType, warning } = await assetComposeService.previewCompose(
      templateType,
      props as Record<string, unknown>,
      assetId
    )

    const base64 = buffer.toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64}`

    return NextResponse.json({
      preview: dataUrl,
      ...(warning ? { warning } : {}),
    })
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'IMAGE_080') {
      return NextResponse.json(
        { error: { code: 'IMAGE_080', message: 'Asset não encontrado.' } },
        { status: 404 }
      )
    }

    console.error('[POST /api/preview/template-asset] Erro:', err)
    return NextResponse.json(
      { error: { code: 'SYS_001', message: 'Falha ao gerar preview. Tente novamente.' } },
      { status: 500 }
    )
  }
}
