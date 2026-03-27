// module-9: Image Composition — Resvg + Sharp
// Rastreabilidade: TASK-3 ST003, INT-061, FEAT-creative-generation-005

import { Resvg } from '@resvg/resvg-js'
import sharp     from 'sharp'

/**
 * Compõe a imagem final: fundo (opcional) + SVG overlay.
 * Se `backgroundBuffer` for undefined, retorna o SVG renderizado diretamente.
 */
export async function composeFinalImage(
  svgString:         string,
  backgroundBuffer:  Buffer | undefined,
  dimensions:        { widthPx: number; heightPx: number },
  format:            'png' | 'webp' = 'webp'
): Promise<Buffer> {
  // 1. Render SVG → PNG via Resvg
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: dimensions.widthPx },
  })
  const svgPng = resvg.render().asPng()

  if (!backgroundBuffer) {
    // SVG only — convert directly to target format
    return sharp(svgPng)
      .resize(dimensions.widthPx, dimensions.heightPx)
      .toFormat(format)
      .toBuffer()
  }

  // 2. Compose: background + SVG overlay
  return sharp(backgroundBuffer)
    .resize(dimensions.widthPx, dimensions.heightPx, { fit: 'cover' })
    .composite([{ input: svgPng, blend: 'over' }])
    .toFormat(format)
    .toBuffer()
}
