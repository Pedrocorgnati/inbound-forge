/**
 * Intake-Review TASK-2 ST002 (CL-CG-012): POST /api/v1/assets/upload
 *
 * Fluxo:
 *   1. requireSession (operator autenticado)
 *   2. Extrai file do multipart/form-data
 *   3. Valida MIME allowlist + magic bytes + tamanho <= 10 MB
 *   4. Upload asset para bucket 'visual-assets' sob path {userId}/{uuid}.{ext}
 *   5. Gera thumbnail 400x400 webp (skip para SVG) e faz upload
 *   6. Persiste VisualAsset com uploadedBy = session.user.id
 *   7. Audit ASSET_UPLOAD
 *   8. Retorna 201 com {id, url, thumbnailUrl, fileSize}
 *
 * RLS: VisualAsset tem RLS habilitada (migration 20260424000003) com filter
 * por uploadedBy = auth.uid(). O admin client (service_role) usado aqui
 * bypass RLS para permitir o INSERT controlado no servidor.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession, badRequest } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { uploadAsset, deleteAsset, uploadThumbnail } from '@/lib/storage/supabase-assets'
import { generateThumbnail } from '@/lib/images/thumbnail'
import { auditLog, AUDIT_ACTIONS } from '@/lib/audit'
import { captureException } from '@/lib/sentry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
])

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

/** Magic-bytes minimos para detectar MIME spoof. */
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

export async function POST(request: NextRequest) {
  const { user, response: authResponse } = await requireSession()
  if (authResponse) return authResponse
  if (!user) return authResponse as never

  let uploadedPath: string | null = null

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return badRequest('Campo "file" obrigatorio em multipart/form-data')
    }

    if (file.size > MAX_BYTES) {
      return badRequest(`Arquivo excede limite de ${MAX_BYTES / 1024 / 1024} MB`)
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return badRequest(`MIME type nao permitido: ${file.type}`)
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const detected = detectMime(buffer)
    if (!detected || !ALLOWED_MIME.has(detected)) {
      return badRequest('Conteudo do arquivo nao confere com MIME declarado')
    }

    const filename = file.name || `asset-${Date.now()}`
    const { url, path, size } = await uploadAsset({
      buffer,
      mimeType: detected,
      userId:   user.id,
      filename,
    })
    uploadedPath = path

    let thumbnailUrl: string | null = null
    try {
      const thumbBuf = await generateThumbnail(buffer, detected)
      const baseName = path.split('/').pop()!.replace(/\.[^.]+$/, '')
      thumbnailUrl = await uploadThumbnail(thumbBuf, user.id, baseName)
    } catch (err) {
      captureException(err, { scope: 'asset.upload.thumbnail' })
      // thumbnail e melhoria de UX — nao bloqueia upload principal
    }

    const asset = await prisma.visualAsset.create({
      data: {
        fileName:      path.split('/').pop() ?? filename,
        originalName:  filename,
        fileType:      detected,
        fileSizeBytes: size,
        storageUrl:    url,
        thumbnailUrl:  thumbnailUrl,
        tags:          [],
        uploadedBy:    user.id,
      } as never,
    })

    await auditLog({
      action:     AUDIT_ACTIONS.ASSET_UPLOAD,
      entityType: 'VisualAsset',
      entityId:   asset.id,
      userId:     user.id,
      metadata:   { fileType: detected, fileSize: size, path },
    })

    return NextResponse.json(
      {
        id:           asset.id,
        url:          asset.storageUrl,
        thumbnailUrl: asset.thumbnailUrl,
        fileSize:     asset.fileSizeBytes,
      },
      {
        status: 201,
        headers: { 'X-Deprecated': 'Use /api/visual-assets instead', 'Deprecation': 'true' },
      },
    )
  } catch (err) {
    // rollback de storage se o INSERT falhou apos upload
    if (uploadedPath) {
      try {
        await deleteAsset(uploadedPath)
      } catch (rollbackErr) {
        captureException(rollbackErr, { scope: 'asset.upload.rollback' })
      }
    }
    captureException(err, { scope: 'asset.upload' })
    console.error('[api.assets.upload]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}
