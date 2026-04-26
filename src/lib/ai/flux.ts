// Inbound Forge — Flux 2 Schnell Client via fal-ai
// Rastreabilidade: CL-050, TASK-2 ST001
// Custo: $0.015/imagem (ver IMAGE_PROVIDERS['flux'])

const FAL_API_URL = 'https://fal.run/fal-ai/flux/schnell'
const FLUX_TIMEOUT_MS = 30_000
const FLUX_MAX_RETRIES = 3
const FLUX_BACKOFF_MS = [500, 1500, 4000] as const

export type FluxErrorKind = 'RATE_LIMIT' | 'UNAVAILABLE' | 'INVALID_PROMPT' | 'TIMEOUT' | 'NETWORK'

export class FluxError extends Error {
  constructor(public kind: FluxErrorKind, message: string, public status?: number) {
    super(message)
    this.name = 'FluxError'
  }
}

function classifyStatus(status: number): FluxErrorKind {
  if (status === 429) return 'RATE_LIMIT'
  if (status === 400 || status === 422) return 'INVALID_PROMPT'
  if (status >= 500) return 'UNAVAILABLE'
  return 'UNAVAILABLE'
}

export interface FluxGenerateRequest {
  prompt: string
  width?: number
  height?: number
  num_inference_steps?: number
  seed?: number
}

export interface FluxGenerateResponse {
  images: Array<{
    url: string
    width: number
    height: number
    content_type: string
  }>
  seed: number
  prompt: string
}

/**
 * Gera imagem de background via Flux 2 Schnell (fal-ai).
 * Custo fixo: $0.015/imagem.
 * Throws em caso de timeout, erro de rede, ou resposta nao-OK.
 */
export async function generateWithFlux(
  apiKey: string,
  request: FluxGenerateRequest
): Promise<FluxGenerateResponse> {
  const payload = {
    prompt: request.prompt,
    image_size:
      request.width && request.height
        ? { width: request.width, height: request.height }
        : { width: 1200, height: 630 },
    num_inference_steps: request.num_inference_steps ?? 4,
    ...(request.seed !== undefined && { seed: request.seed }),
  }

  let lastErr: unknown
  for (let attempt = 0; attempt < FLUX_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(FAL_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(FLUX_TIMEOUT_MS),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        const kind = classifyStatus(response.status)
        if (kind === 'INVALID_PROMPT') {
          throw new FluxError(kind, `Flux ${response.status}: ${text}`, response.status)
        }
        lastErr = new FluxError(kind, `Flux ${response.status}: ${text}`, response.status)
      } else {
        return (await response.json()) as FluxGenerateResponse
      }
    } catch (err) {
      if (err instanceof FluxError && err.kind === 'INVALID_PROMPT') throw err
      const isTimeout = err instanceof Error && err.name === 'TimeoutError'
      lastErr = err instanceof FluxError
        ? err
        : new FluxError(isTimeout ? 'TIMEOUT' : 'NETWORK', String(err))
    }
    const delay = FLUX_BACKOFF_MS[attempt]
    if (delay && attempt < FLUX_MAX_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastErr instanceof FluxError ? lastErr : new FluxError('UNAVAILABLE', String(lastErr))
}

/**
 * Testa conectividade com a API do fal-ai.
 * Retorna true se a chave e valida (nao 401/403).
 */
export async function testFluxConnection(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        Authorization: `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: 'test', num_inference_steps: 1 }),
      signal: AbortSignal.timeout(10_000),
    })
    return response.status !== 401 && response.status !== 403
  } catch {
    return false
  }
}

/**
 * Extrai a URL da primeira imagem gerada.
 */
export function extractFluxImageUrl(response: FluxGenerateResponse): string {
  const image = response.images[0]
  if (!image?.url) throw new Error('Flux: resposta sem URL de imagem')
  return image.url
}
