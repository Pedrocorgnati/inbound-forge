// module-10: Thumbnail Service — Sharp 200×200 WebP
// Rastreabilidade: TASK-1 ST004, INT-063, FEAT-creative-generation-009
//
// REGRAS:
//   - SVG: retorna null (sem thumbnail raster)
//   - Falha de geração: loga e retorna null (não cancela o upload principal)
//   - Output: WebP 200×200 cover (sem distorção)

import sharp            from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ASSET_UPLOAD_CONFIG } from '@/lib/constants/asset-library'
import { captureException } from '@/lib/sentry'

export const thumbnailService = {
  /**
   * Gera thumbnail WebP 200×200 a partir de um buffer de imagem.
   * Retorna null para SVG ou em caso de erro.
   */
  async generate(buffer: Buffer, mimeType: string): Promise<Buffer | null> {
    // SVG: não gera thumbnail raster
    if (mimeType === 'image/svg+xml') {
      return null
    }

    try {
      const thumbnail = await sharp(buffer)
        .resize(
          ASSET_UPLOAD_CONFIG.thumbnailDimensions.width,
          ASSET_UPLOAD_CONFIG.thumbnailDimensions.height,
          { fit: 'cover' }
        )
        .webp({ quality: 80 })
        .toBuffer()

      return thumbnail
    } catch (err) {
      captureException(err, { service: 'thumbnail', step: 'generate' })
      return null
    }
  },

  /**
   * Gera thumbnail e faz upload para Supabase Storage.
   * Retorna a URL pública do thumbnail ou null se não gerado.
   */
  async generateAndUpload(
    buffer:     Buffer,
    mimeType:   string,
    assetFileName: string,  // ex: "1234567890-abc123.png" → thumbnail: "1234567890-abc123.webp"
    userId:     string,
    supabase:   SupabaseClient,
    bucket:     string
  ): Promise<string | null> {
    const thumbnailBuffer = await this.generate(buffer, mimeType)
    if (!thumbnailBuffer) return null

    // Usar mesmo base name do asset, sempre com extensão .webp
    // REMEDIATION M9-G-002: path usa {userId}/thumbnails/ para compatibilidade com RLS
    const base          = assetFileName.replace(/\.[^.]+$/, '')
    const thumbFileName = `${base}.webp`
    const thumbPath     = `${userId}/thumbnails/${thumbFileName}`

    const { error } = await supabase.storage
      .from(bucket)
      .upload(thumbPath, thumbnailBuffer, {
        contentType: 'image/webp',
        upsert:      false,
      })

    if (error) {
      captureException(error, { service: 'thumbnail', step: 'upload' })
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(thumbPath)

    return publicUrl
  },
}
