// module-9: Image Generation Orchestrator
// Rastreabilidade: TASK-3 ST004 ST005, FEAT-creative-generation-004, CX-02
//
// Pipeline:
//   renderTemplate → generateBackground → composeFinalImage → uploadImageToStorage
//   → updateContentPiece (CX-02) → recordCost → return publicUrl

import type { PrismaClient } from '@prisma/client'
import type { WorkerEnv }    from './env'
import type { TemplateType, ImageProvider } from './types'
import type { TemplateBaseProps }           from './templates/types'

import { renderTemplate }                    from './render'
import { generateBackground, selectProvider } from './providers/index'
import { composeFinalImage }                 from './compose'
import { uploadImageToStorage }              from './storage'
import { recordCost }                        from './health'
import { IMAGE_DIMENSIONS, IMAGE_PROVIDERS, BRAND_COLOR_DEFAULT } from './constants'

export interface GenerateImageOptions {
  jobId:           string
  templateType:    TemplateType
  templateProps:   TemplateBaseProps & Record<string, unknown>
  prompt:          string
  contentPieceId?: string | null
  format?:         'png' | 'webp'
  /** TASK-2 ST003 — override de roteamento Ideogram/Flux por template. */
  backgroundNeedsText?: boolean
}

/**
 * Orquestrador completo de geração de imagem.
 * Chamado pelo consumer para cada job PROCESSING.
 * @returns URL pública da imagem gerada (Supabase Storage)
 */
export async function generateImage(
  opts:    GenerateImageOptions,
  db:      PrismaClient,
  env:     WorkerEnv,
  signal?: AbortSignal
): Promise<string> {
  const startedAt = Date.now()
  const {
    jobId,
    templateType,
    templateProps,
    prompt,
    contentPieceId,
    format = 'webp',
    backgroundNeedsText,
  } = opts

  const dimensions  = IMAGE_DIMENSIONS[templateType]
  const brandColor  = (templateProps.brandColor as string | undefined) ?? BRAND_COLOR_DEFAULT

  // 1. Render template → SVG
  const svgString = await renderTemplate(templateType, templateProps)

  // 2. Generate background (NEVER rejects — returns Buffer in all cases)
  const backgroundBuffer = await generateBackground(
    templateType,
    prompt,
    dimensions,
    { IDEOGRAM_API_KEY: env.IDEOGRAM_API_KEY, FAL_API_KEY: env.FAL_API_KEY },
    signal,
    brandColor,
    { backgroundNeedsText }
  )

  // 3. Determine which provider was actually used (best effort)
  //    TASK-2 ST003 — respeita override de needsText (Ideogram para texto, Flux senao).
  const providerUsed: ImageProvider =
    backgroundNeedsText === true
      ? 'ideogram'
      : backgroundNeedsText === false
        ? 'flux'
        : selectProvider(templateType)

  // 4. Compose SVG overlay on background
  const finalBuffer = await composeFinalImage(svgString, backgroundBuffer, dimensions, format)

  // 5. Upload to Supabase Storage (storage.ts is upload-only — no DB access)
  const publicUrl = await uploadImageToStorage(
    finalBuffer,
    jobId,
    format,
    {
      SUPABASE_URL:              env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_STORAGE_BUCKET:   env.SUPABASE_STORAGE_BUCKET,
    },
    signal
  )

  // 6. CX-02: Update ContentPiece with generatedImageUrl + imageJobId (orchestrator responsibility)
  if (contentPieceId) {
    await db.contentPiece.update({
      where: { id: contentPieceId },
      data:  { generatedImageUrl: publicUrl, imageJobId: jobId },
    })
  }

  // 7. Log cost (ST005)
  const durationMs = Date.now() - startedAt
  const costUsd    = IMAGE_PROVIDERS[providerUsed].costUsd

  process.stdout.write(JSON.stringify({
    level:     'info',
    event:     'image.generated',
    jobId,
    provider:  providerUsed,
    costUsd,
    templateType,
    durationMs,
    timestamp: new Date().toISOString(),
  }) + '\n')

  recordCost({
    jobId,
    provider:    providerUsed,
    costUsd,
    templateType,
    durationMs,
    recordedAt:  new Date().toISOString(),
  })

  return publicUrl
}
