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

// REMEDIATION M9-G-005: magic-byte detection para prevenir MIME spoof no endpoint canonico
function detectMime(buffer: Buffer): string | null {
  if (buffer.length >= 8 &&
      buffer[0] === 0x89 && buffer[1] === 0x50 &&
      buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png'
  if (buffer.length >= 3 &&
      buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer.length >= 12 &&
      buffer.slice(0, 4).toString() === 'RIFF' &&
      buffer.slice(8, 12).toString() === 'WEBP') return 'image/webp'
  const head = buffer.slice(0, 512).toString('utf8').trimStart()
  if (head.startsWith('<?xml') || head.startsWith('<svg')) return 'image/svg+xml'
  return null
}

// ─── GET /api/visual-assets ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireSession()
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

  const result = await visualAssetService.list({ ...parsed.data, uploadedBy: user!.id })
  return okPaginated(result.items, {
    page:  result.page,
    limit: parsed.data.limit,
    total: result.total,
  })
}

// ─── POST /api/visual-assets ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Content-Length pre-check — rejeita antes de ler o body para evitar memory exhaustion
  const contentLength = parseInt(request.headers.get('content-length') ?? '0', 10)
  if (contentLength > ASSET_UPLOAD_CONFIG.maxFileSizeBytes * 1.15) {
    return NextResponse.json(
      { error: { code: 'VAL_003', message: 'Requisição excede tamanho máximo permitido (5MB).' } },
      { status: 413 }
    )
  }

  const { user, response: authResponse } = await requireSession()
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

  // VAL_004 — magic-byte verification (anti MIME spoof)
  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const detectedMime = detectMime(fileBuffer)
  if (detectedMime && detectedMime !== file.type) {
    return NextResponse.json(
      { error: { code: 'VAL_004', message: 'Tipo do arquivo não corresponde ao conteúdo real.' } },
      { status: 400 }
    )
  }

  // Validação Zod completa
  const parsed = uploadAssetSchema.safeParse({ file, altText })
  if (!parsed.success) {
    return validationError(parsed.error)
  }

  try {
    const asset = await visualAssetService.upload(file, user!.id, altText)
    return ok(asset, 201)
  } catch (err) {
    console.error('[POST /api/visual-assets] Erro no upload:', err)
    return NextResponse.json(
      { error: { code: 'SYS_001', message: 'Erro ao fazer upload. Tente novamente.' } },
      { status: 500 }
    )
  }
}
