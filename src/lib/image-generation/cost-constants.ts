/**
 * Cost constants — Intake Review TASK-14 ST002 (CL-071).
 *
 * Single source of truth for image-generation provider cost per image (USD).
 * Consumed by backgroundRouter + CostLog telemetry.
 */

/** Preco medio por imagem gerada via Ideogram V2 (USD). */
export const IDEOGRAM_COST_USD = 0.04

/** Preco medio por imagem gerada via Flux Schnell (USD). */
export const FLUX_COST_USD = 0.015

/**
 * Economia percentual ao usar Flux em vez de Ideogram.
 * (IDEOGRAM_COST_USD - FLUX_COST_USD) / IDEOGRAM_COST_USD = 0.625.
 */
export const FLUX_SAVINGS_PCT = 0.625

/** Alias legado — mantido por compatibilidade com telemetria antiga. */
export const FLUX_SAVINGS_VS_IDEOGRAM = FLUX_SAVINGS_PCT

export function costForProvider(provider: 'ideogram' | 'flux'): number {
  return provider === 'ideogram' ? IDEOGRAM_COST_USD : FLUX_COST_USD
}
