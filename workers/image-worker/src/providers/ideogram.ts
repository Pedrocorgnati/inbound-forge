// module-9: Ideogram Provider — $0.04/imagem
// Rastreabilidade: TASK-3 ST001, INT-094, FEAT-creative-generation-001

interface IdeogramResponse {
  data: Array<{
    url: string
  }>
}

function dimensionsToAspectRatio(widthPx: number, heightPx: number): string {
  const ratio = widthPx / heightPx
  if (Math.abs(ratio - 1) < 0.05) return 'SQUARE'
  if (ratio > 1.5)                 return 'LANDSCAPE'
  if (ratio < 0.8)                 return 'PORTRAIT'
  return 'SQUARE'
}

/**
 * Gera imagem via Ideogram API.
 * Retorna URL pública da imagem gerada — o caller (providers/index.ts) é responsável pelo download.
 */
export async function generateWithIdeogram(
  prompt:     string,
  dimensions: { widthPx: number; heightPx: number },
  apiKey:     string,
  signal?:    AbortSignal
): Promise<string> {
  const body = JSON.stringify({
    image_request: {
      prompt,
      aspect_ratio:  dimensionsToAspectRatio(dimensions.widthPx, dimensions.heightPx),
      model:         'V_2',
      magic_prompt:  'AUTO',
    },
  })

  const res = await fetch('https://api.ideogram.ai/generate', {
    method:  'POST',
    headers: {
      'Api-Key':      apiKey,
      'Content-Type': 'application/json',
    },
    body,
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Provider Ideogram failed (${res.status}): ${text}`)
  }

  const json = await res.json() as IdeogramResponse

  const url = json?.data?.[0]?.url
  if (!url) {
    throw new Error('Provider Ideogram: resposta sem URL de imagem')
  }

  return url
}
