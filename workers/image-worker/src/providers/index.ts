// module-9: Provider Selector com Fallback Hierárquico
// Rastreabilidade: TASK-3 ST002, INT-112, FEAT-creative-generation-003
//
// INVARIANTE: generateBackground() SEMPRE retorna Buffer (nunca rejeita).
//   - Provider primário → URL → download → Buffer
//   - Provider alternativo → URL → download → Buffer
//   - Fallback estático → Buffer sólido da marca

import type { TemplateType } from '../types'
import { TEMPLATE_PROVIDER_MAP } from '../constants'
import { generateWithIdeogram }  from './ideogram'
import { generateWithFlux }      from './flux'
import { generateStaticBackground } from './static'

export type { TemplateType }

export function selectProvider(templateType: TemplateType): 'ideogram' | 'flux' {
  const p = TEMPLATE_PROVIDER_MAP[templateType]
  return (p === 'static' ? 'flux' : p) ?? 'flux'
}

async function downloadBuffer(url: string, signal?: AbortSignal): Promise<Buffer> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Gera background para o template usando o provider mais adequado.
 * NUNCA rejeita — fallback estático garante Buffer em qualquer cenário.
 */
export async function generateBackground(
  templateType: TemplateType,
  prompt:       string,
  dimensions:   { widthPx: number; heightPx: number },
  env:          { IDEOGRAM_API_KEY: string; FAL_API_KEY: string },
  signal?:      AbortSignal,
  brandColor?:  string,
  opts?:        { backgroundNeedsText?: boolean }
): Promise<Buffer> {
  // TASK-2 ST003 — override explicito (Ideogram com texto, Flux sem) prevalece sobre TEMPLATE_PROVIDER_MAP.
  const primary: 'ideogram' | 'flux' =
    opts?.backgroundNeedsText === true
      ? 'ideogram'
      : opts?.backgroundNeedsText === false
        ? 'flux'
        : selectProvider(templateType)
  const secondary: 'ideogram' | 'flux' = primary === 'ideogram' ? 'flux' : 'ideogram'

  // Helper: call provider and download buffer
  async function tryProvider(provider: 'ideogram' | 'flux'): Promise<Buffer> {
    const url = provider === 'ideogram'
      ? await generateWithIdeogram(prompt, dimensions, env.IDEOGRAM_API_KEY, signal)
      : await generateWithFlux(prompt, dimensions, env.FAL_API_KEY, signal)
    return downloadBuffer(url, signal)
  }

  // 1. Try primary
  try {
    return await tryProvider(primary)
  } catch (primaryErr) {
    // Re-throw AbortErrors — no point in fallback if cancelled
    if ((primaryErr as Error).name === 'AbortError') throw primaryErr
    process.stderr.write(JSON.stringify({
      level:    'warn',
      event:    'provider_failed',
      provider: primary,
      error:    String(primaryErr),
    }) + '\n')
  }

  // 2. Try secondary
  try {
    return await tryProvider(secondary)
  } catch (secondaryErr) {
    if ((secondaryErr as Error).name === 'AbortError') throw secondaryErr
    process.stderr.write(JSON.stringify({
      level:    'warn',
      event:    'all_ai_providers_failed',
      provider: secondary,
      error:    String(secondaryErr),
    }) + '\n')
  }

  // 3. Static fallback — never fails
  process.stderr.write(JSON.stringify({
    level: 'warn',
    event: 'using_static_fallback',
  }) + '\n')

  return generateStaticBackground(dimensions, brandColor)
}
