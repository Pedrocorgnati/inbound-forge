'use client'

// Contexto de ativação para PreviewGate → ScoreGauge
// Quando isActivated=false, ScoreGauge se oculta via este contexto

import { createContext, useContext } from 'react'

interface PreviewActivationContextValue {
  isActivated: boolean
}

export const PreviewActivationContext = createContext<PreviewActivationContextValue>({
  isActivated: true,
})

export function usePreviewActivation() {
  return useContext(PreviewActivationContext)
}
