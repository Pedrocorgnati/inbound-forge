/**
 * Intake-Review TASK-2 ST003 (CL-CG-012): gerador de thumbnail 400x400 webp
 * para uploads de VisualAsset.
 *
 * Difere do `thumbnail.service.ts` em src/lib/services/ (200x200, outro
 * bucket/feature — images geradas por IA). Manter separado para preservar
 * independencia de dimensoes entre features.
 *
 * Para SVG, retorna o buffer original (rasterizar SVG distorceria).
 */
import sharp from 'sharp'

export const VISUAL_ASSET_THUMBNAIL_SIZE = 400

export async function generateThumbnail(
  buffer: Buffer,
  mimeType: string,
): Promise<Buffer> {
  if (mimeType === 'image/svg+xml') return buffer
  return sharp(buffer)
    .resize(VISUAL_ASSET_THUMBNAIL_SIZE, VISUAL_ASSET_THUMBNAIL_SIZE, { fit: 'cover' })
    .webp({ quality: 82 })
    .toBuffer()
}
