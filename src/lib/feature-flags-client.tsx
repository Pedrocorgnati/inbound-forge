'use client'

/**
 * feature-flags-client.tsx — Client-side feature flag hook (Next.js App Router)
 *
 * Gerado por: /rollout-strategy-create setup
 * Estratégia: server-evaluated flags passadas via props/context (não depende do SDK JS do PostHog)
 *
 * Para sistema single-user, as flags são avaliadas no servidor e passadas para o cliente
 * via Server Component props ou Context. Isso evita flash de conteúdo e é mais seguro.
 *
 * USO RECOMENDADO:
 * 1. Avaliar flags no Server Component com `evaluateFlags()` de feature-flags.ts
 * 2. Passar o mapa de flags via FeatureFlagsProvider
 * 3. Consumir com `useFeatureFlag()` em Client Components
 */

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import type { FeatureFlagKey } from './feature-flags'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type FlagMap = Partial<Record<FeatureFlagKey, boolean>>

const FeatureFlagsContext = createContext<FlagMap>({})

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface FeatureFlagsProviderProps {
  flags: FlagMap
  children: ReactNode
}

/**
 * Provedor de feature flags para Client Components.
 *
 * Usar em Server Components (layout.tsx ou page.tsx) para injetar
 * o estado das flags avaliado no servidor:
 *
 * @example
 * // src/app/(dashboard)/layout.tsx (Server Component)
 * import { evaluateFlags, FeatureFlags } from '@/lib/feature-flags'
 * import { FeatureFlagsProvider } from '@/lib/feature-flags-client'
 *
 * export default async function DashboardLayout({ children }) {
 *   const flags = await evaluateFlags([
 *     FeatureFlags.INSTAGRAM_PUBLISHING_LIVE,
 *     FeatureFlags.LEAD_CAPTURE_LIVE,
 *     FeatureFlags.ONBOARDING_WIZARD,
 *   ])
 *   return (
 *     <FeatureFlagsProvider flags={flags}>
 *       {children}
 *     </FeatureFlagsProvider>
 *   )
 * }
 */
export function FeatureFlagsProvider({ flags, children }: FeatureFlagsProviderProps) {
  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook para consumir uma feature flag em Client Components.
 *
 * Retorna `false` se a flag não foi fornecida no Provider (fail-safe).
 *
 * @example
 * 'use client'
 * import { useFeatureFlag } from '@/lib/feature-flags-client'
 * import { FeatureFlags } from '@/lib/feature-flags'
 *
 * export function PublishButton() {
 *   const canPublish = useFeatureFlag(FeatureFlags.INSTAGRAM_PUBLISHING_LIVE)
 *   if (!canPublish) return null
 *   return <button>Publicar no Instagram</button>
 * }
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  const flags = useContext(FeatureFlagsContext)
  return flags[flag] ?? false
}

/**
 * Hook para obter o mapa completo de flags injetadas.
 * Útil para debug ou para passar todas as flags para um componente filho.
 */
export function useFeatureFlags(): FlagMap {
  return useContext(FeatureFlagsContext)
}
