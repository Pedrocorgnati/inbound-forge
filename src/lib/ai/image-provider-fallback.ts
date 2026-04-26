// Provider fallback cascade com circuit breaker (TASK-14 ST003 / CL-262)
// Centraliza a decisao "tentar provider X?" e consolida contadores por provider.
// Providers: ideogram -> flux -> satori (estatico).

import 'server-only'
import { isOpen, recordFailure, recordSuccess } from './circuit-breaker'

export type ImageProviderId = 'ideogram' | 'flux' | 'satori'

const PROVIDER_ORDER: ImageProviderId[] = ['ideogram', 'flux', 'satori']

export function nextAvailableProviders(): ImageProviderId[] {
  return PROVIDER_ORDER.filter((p) => !isOpen(`image-provider:${p}`))
}

export function canAttempt(provider: ImageProviderId): boolean {
  return !isOpen(`image-provider:${provider}`)
}

export function markSuccess(provider: ImageProviderId): void {
  recordSuccess(`image-provider:${provider}`)
}

export function markFailure(provider: ImageProviderId): void {
  recordFailure(`image-provider:${provider}`)
}
