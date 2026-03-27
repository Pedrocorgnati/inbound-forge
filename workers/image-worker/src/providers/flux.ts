// module-9: Flux Provider via Fal.ai — $0.015/imagem
// Rastreabilidade: TASK-3 ST001, INT-095, FEAT-creative-generation-001

import * as fal from '@fal-ai/serverless-client'

interface FalOutput {
  images: Array<{ url: string }>
}

/**
 * Gera imagem via Fal.ai Flux model.
 * Retorna URL pública da imagem gerada — o caller (providers/index.ts) é responsável pelo download.
 */
export async function generateWithFlux(
  prompt:     string,
  dimensions: { widthPx: number; heightPx: number },
  apiKey:     string,
  signal?:    AbortSignal
): Promise<string> {
  fal.config({ credentials: apiKey })

  // Wrap with AbortSignal support via Promise.race
  const runPromise = fal.run('fal-ai/flux/dev', {
    input: {
      prompt,
      image_size: { width: dimensions.widthPx, height: dimensions.heightPx },
      num_images: 1,
      enable_safety_checker: false,
    },
  }) as Promise<FalOutput>

  let result: FalOutput

  if (signal) {
    const abortPromise = new Promise<never>((_, reject) => {
      if (signal.aborted) {
        const err = new Error('Aborted')
        err.name  = 'AbortError'
        reject(err)
        return
      }
      signal.addEventListener('abort', () => {
        const err = new Error('Aborted')
        err.name  = 'AbortError'
        reject(err)
      }, { once: true })
    })
    result = await Promise.race([runPromise, abortPromise])
  } else {
    result = await runPromise
  }

  const url = result?.images?.[0]?.url
  if (!url) {
    throw new Error('Provider Flux: resposta sem URL de imagem')
  }

  return url
}
