// module-10: Asset Compose Service
// Rastreabilidade: TASK-2 ST001, INT-062, INT-063, FEAT-creative-generation-004+006+009
//
// Pipeline: VisualAsset + Template → ImageJob DONE (síncrono, < 3s, sem Redis)
// Fluxo:
//   1. Buscar VisualAsset por ID (404 → IMAGE_080)
//   2. Download do asset do Supabase Storage → Buffer
//   3. Resize para dimensões do template com Sharp
//   4. renderTemplate(templateType, props) → SVG string
//   5. composeFinalImage(svgString, backgroundBuffer, dimensions) → Buffer
//   6. uploadImageToStorage(buffer, jobId) → URL pública
//   7. Atualizar ImageJob e ContentPiece (CX-02)

import { createClient }                from '@supabase/supabase-js'
import { prisma }                      from '@/lib/prisma'
import { renderTemplate, composeFinalImage } from '@/lib/image-pipeline'
import { visualAssetService }          from './visual-asset.service'
import { IMAGE_DIMENSIONS }            from '@/lib/constants/image-worker'
import type { TemplateType }           from '@/types/image-template'
import type { VisualAsset as PrismaVisualAsset } from '@prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComposeWithAssetInput {
  jobId:        string
  templateType: TemplateType
  templateProps: Record<string, unknown>
  assetId:       string
}

export interface ComposeResult {
  resultUrl:         string
  warning?:          'aspect_ratio_mismatch'
  processingMs:      number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucket = process.env.SUPABASE_STORAGE_BUCKET

  if (!url || !key || !bucket) {
    throw new Error('Supabase env vars ausentes para asset-compose')
  }

  return { client: createClient(url, key), bucket }
}

/**
 * Verifica compatibilidade de aspect ratio entre asset e template.
 * Tolerância de 20% — retorna false (warning) mas NÃO bloqueia a composição.
 */
export function isAssetCompatibleWithTemplate(
  asset:        PrismaVisualAsset,
  templateType: TemplateType
): boolean {
  if (!asset.widthPx || !asset.heightPx) return true // SVG: sempre compatível

  const templateDims   = IMAGE_DIMENSIONS[templateType]
  const templateAspect = templateDims.widthPx / templateDims.heightPx
  const assetAspect    = asset.widthPx / asset.heightPx

  return Math.abs(templateAspect - assetAspect) / templateAspect < 0.2
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const assetComposeService = {
  /**
   * Pipeline completo de composição com asset do operador.
   * Retorna URL pública da imagem composta.
   */
  async composeWithAsset(input: ComposeWithAssetInput): Promise<ComposeResult> {
    const { jobId, templateType, templateProps, assetId } = input
    const startMs = Date.now()

    // 1. Buscar VisualAsset (IMAGE_080 se não encontrado)
    const asset = await visualAssetService.findById(assetId)
    if (!asset) {
      const err = new Error('Asset não encontrado.')
      ;(err as NodeJS.ErrnoException).code = 'IMAGE_080'
      throw err
    }

    // 2. Download do asset do Supabase Storage
    const { client, bucket } = getStorageClient()
    const urlObj   = new URL(asset.storageUrl)
    const filePath = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`)[1]

    const { data: downloadData, error: downloadError } = await client.storage
      .from(bucket)
      .download(filePath)

    if (downloadError || !downloadData) {
      throw new Error(`Falha ao baixar asset do Storage: ${downloadError?.message ?? 'sem dados'}`)
    }

    const backgroundBuffer = Buffer.from(await downloadData.arrayBuffer())
    const dimensions       = IMAGE_DIMENSIONS[templateType]

    // 3. Verificar compatibilidade de aspect ratio (warning, não erro)
    const compatible = isAssetCompatibleWithTemplate(asset, templateType)

    // 4. Renderizar template SVG (overlay sobre o asset)
    const svgString = await renderTemplate(templateType, templateProps)

    // 5. Compor imagem final (background + overlay)
    const finalBuffer = await composeFinalImage(svgString, backgroundBuffer, dimensions, 'webp')

    // 6. Upload da imagem final para Storage
    const outputPath = `image-jobs/${jobId}.webp`
    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(outputPath, finalBuffer, { contentType: 'image/webp', upsert: true })

    if (uploadError) {
      throw new Error(`Falha ao fazer upload da imagem composta: ${uploadError.message}`)
    }

    const { data: { publicUrl: resultUrl } } = client.storage
      .from(bucket)
      .getPublicUrl(outputPath)

    // 7. Atualizar ImageJob (CX-02)
    await prisma.imageJob.update({
      where: { id: jobId },
      data:  {
        status:     'DONE',
        imageUrl:   resultUrl,
        outputUrl:  resultUrl,
        completedAt: new Date(),
        processingMs: Date.now() - startMs,
        metadata: {
          assetId,
          templateType,
          compositionMode: 'operator-asset',
        },
      },
    })

    // Rastrear uso do asset
    await visualAssetService.recordJobUsage(assetId, jobId)

    return {
      resultUrl,
      warning:      compatible ? undefined : 'aspect_ratio_mismatch',
      processingMs: Date.now() - startMs,
    }
  },

  /**
   * Preview de composição sem criar ImageJob.
   * Retorna a imagem como Buffer (para API retornar como base64 ou URL temporária).
   */
  async previewCompose(
    templateType:  TemplateType,
    templateProps: Record<string, unknown>,
    assetId:       string
  ): Promise<{ buffer: Buffer; mimeType: string; warning?: 'aspect_ratio_mismatch' }> {
    const asset = await visualAssetService.findById(assetId)
    if (!asset) {
      const err = new Error('Asset não encontrado.')
      ;(err as NodeJS.ErrnoException).code = 'IMAGE_080'
      throw err
    }

    const { client, bucket } = getStorageClient()
    const urlObj   = new URL(asset.storageUrl)
    const filePath = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`)[1]

    const { data: downloadData, error: downloadError } = await client.storage
      .from(bucket)
      .download(filePath)

    if (downloadError || !downloadData) {
      throw new Error(`Falha ao baixar asset: ${downloadError?.message ?? 'sem dados'}`)
    }

    const backgroundBuffer = Buffer.from(await downloadData.arrayBuffer())
    const dimensions       = IMAGE_DIMENSIONS[templateType]
    const compatible       = isAssetCompatibleWithTemplate(asset, templateType)

    const svgString   = await renderTemplate(templateType, templateProps)
    const finalBuffer = await composeFinalImage(svgString, backgroundBuffer, dimensions, 'webp')

    return {
      buffer:   finalBuffer,
      mimeType: 'image/webp',
      warning:  compatible ? undefined : 'aspect_ratio_mismatch',
    }
  },
}
