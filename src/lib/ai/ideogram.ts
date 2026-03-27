// Inbound Forge — Ideogram 2.0 API Client
// A-007: timeout explícito de 60s via AbortSignal
// Rastreabilidade: INT-058, FEAT-creative-generation-002

const IDEOGRAM_API_URL = 'https://api.ideogram.ai/generate'
const IDEOGRAM_TIMEOUT_MS = 60_000

export interface IdeogramGenerateRequest {
  image_request: {
    prompt: string
    aspect_ratio?: string
    style_type?: string
    color_palette?: { name: string }
    magic_prompt_option?: string
  }
}

export interface IdeogramGenerateResponse {
  created: string
  data: Array<{
    url: string
    prompt: string
    resolution: string
    is_image_safe: boolean
    seed: number
    style_type: string
  }>
}

/**
 * Gera imagem via Ideogram 2.0 com timeout explícito de 60s.
 * Throws em caso de timeout, erro de rede, ou resposta não-OK.
 */
export async function generateWithIdeogram(
  apiKey: string,
  payload: IdeogramGenerateRequest
): Promise<IdeogramGenerateResponse> {
  const response = await fetch(IDEOGRAM_API_URL, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(IDEOGRAM_TIMEOUT_MS),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Ideogram API error ${response.status}: ${text}`)
  }

  return response.json() as Promise<IdeogramGenerateResponse>
}

/**
 * Testa conectividade com a API do Ideogram.
 * Retorna true se a chave é válida (não 401/403).
 */
export async function testIdeogramConnection(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(IDEOGRAM_API_URL, {
      method: 'POST',
      headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_request: { prompt: 'test', aspect_ratio: 'ASPECT_1_1' } }),
      signal: AbortSignal.timeout(IDEOGRAM_TIMEOUT_MS),
    })
    return res.status !== 401 && res.status !== 403
  } catch {
    return false
  }
}
