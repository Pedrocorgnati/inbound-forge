// module-9: Static Fallback Provider — $0.00/imagem
// Rastreabilidade: TASK-3 ST002, INT-058, FEAT-creative-generation-003

import sharp from 'sharp'

/**
 * Gera PNG sólido com a cor da marca.
 * Nunca falha — fallback final do pipeline de geração.
 */
export async function generateStaticBackground(
  dimensions: { widthPx: number; heightPx: number },
  brandColor  = '#4F46E5'
): Promise<Buffer> {
  return sharp({
    create: {
      width:      dimensions.widthPx,
      height:     dimensions.heightPx,
      channels:   4,
      background: brandColor,
    },
  })
    .png()
    .toBuffer()
}
