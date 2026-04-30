// Inbound Forge — Background provider router
// Rastreabilidade: TASK-2 ST002 (CL-042, CL-141)
//
// Heuristica: Ideogram renderiza texto com qualidade superior; Flux 2 Schnell
// custa ~62% menos ($0.015 vs $0.040) e e ideal para backgrounds sem texto
// (abstratos, gradientes, cenas, texturas).

export type BackgroundProvider = 'IDEOGRAM' | 'FLUX'

export interface SelectProviderInput {
  needsText: boolean
  templateType?: string
}

export function selectBackgroundProvider(input: SelectProviderInput): BackgroundProvider {
  const override = process.env.FORCE_PROVIDER
  if (override === 'IDEOGRAM' || override === 'FLUX') {
    return override
  }
  return input.needsText ? 'IDEOGRAM' : 'FLUX'
}

export const PROVIDER_COST_USD: Record<BackgroundProvider, number> = {
  IDEOGRAM: 0.04,
  FLUX: 0.015,
}
