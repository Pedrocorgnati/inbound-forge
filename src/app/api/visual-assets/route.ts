/**
 * GET  /api/visual-assets — Listagem paginada de assets
 * POST /api/visual-assets — Upload de novo asset
 *
 * Módulo: module-10-asset-library (TASK-1 ST001)
 * Rastreabilidade: INT-063, PERF-002, PERF-003, QUAL-005
 * Error Catalog: VAL_001 (400), VAL_002 (400), VAL_003 (400), SYS_001 (500), AUTH_001 (401)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, okPaginated, validationError } from '@/lib/api-auth'
import { visualAssetService } from '@/lib/services/visual-asset.service'
import { listAssetsSchema, uploadAssetSchema } from '@/lib/validators/visual-asset'
import { ASSET_UPLOAD_CONFIG } from '@/lib/constants/asset-library'

// ─── GET /api/visual-assets ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const { searchParams } = request.nextUrl
  const parsed = listAssetsSchema.safeParse({
    page:     searchParams.get('page')     ?? 1,
    limit:    searchParams.get('limit')    ?? ASSET_UPLOAD_CONFIG.pageSize,
    fileType: searchParams.get('type')     ?? undefined,
    tag:      searchParams.get('tag')      ?? undefined,
  })

  if (!parsed.success) {
    return validationError(parsed.error)
  }

  const result = await visualAssetService.list(parsed.data)
  return okPaginated(result.items, {
    page:  result.page,
    limit: parsed.data.limit,
    total: result.total,
  })
}

// ─── POST /api/visual-assets ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return validationError('Corpo da requisição deve ser multipart/form-data')
  }

  const file    = formData.get('file')
  const altText = formData.get('altText')?.toString()

  // VAL_001 — campo file ausente
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: { code: 'VAL_001', message: 'Campo "file" ausente na requisição.' } },
      { status: 400 }
    )
  }

  // VAL_003 — arquivo > 5MB
  if (file.size > ASSET_UPLOAD_CONFIG.maxFileSizeBytes) {
    const sizeMb = (file.size / 1_000_000).toFixed(1)
    return NextResponse.json(
      {
        error: {
          code:    'VAL_003',
          message: `${file.name} excede 5MB (atual: ${sizeMb}MB)`,
        },
      },
      { status: 400 }
    )
  }

  // VAL_002 — tipo MIME não suportado
  if (!(ASSET_UPLOAD_CONFIG.allowedTypes as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { error: { code: 'VAL_002', message: 'Tipo não suportado. Use PNG, JPG, WebP ou SVG.' } },
      { status: 400 }
    )
  }

  // Validação Zod completa
  const parsed = uploadAssetSchema.safeParse({ file, altText })
  if (!parsed.success) {
    return validationError(parsed.error)
  }

  try {
    const asset = await visualAssetService.upload(file, altText)
    return ok(asset, 201)
  } catch (err) {
    console.error('[POST /api/visual-assets] Erro no upload:', err)
    return NextResponse.json(
      { error: { code: 'SYS_001', message: 'Erro ao fazer upload. Tente novamente.' } },
      { status: 500 }
    )
  }
}
