'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ONBOARDING_STEPS } from '@/constants/onboarding-steps'
import { STORAGE_KEYS } from '@/constants/storage-keys'

/**
 * Task 022 (loop 05-27-inbound-forge-user-friendly) — P3: onboarding deep-link via ?step=N.
 *
 * Integra com o onboarding real (route group `(onboarding)`): TOTAL_STEPS deriva de
 * ONBOARDING_STEPS, e o progresso persistido vem de GET /api/onboarding/state (fonte de
 * verdade), com fallback para o localStorage usado pelo OnboardingWizard.
 *
 * O hook apenas deriva estado. Decisoes de UI (toast, render do passo, redirect) pertencem
 * ao consumidor (OnboardingWizard): o hook expoe `toastMessage` e `redirectTo`, nunca chama
 * toast nem navega.
 */

export const TOTAL_STEPS = ONBOARDING_STEPS.length

export const ONBOARDING_STEP_TOAST = {
  /** Parametro `?step` invalido (nao inteiro, fora de faixa). */
  INVALID: 'Passo inválido, retomando de onde você parou',
  /** Tentativa de pular passo com pre-requisito incompleto. */
  PREREQUISITE: 'Complete o passo anterior antes de continuar',
} as const

export interface OnboardingStepQueryResult {
  /** Passo que o consumidor deve renderizar (1-based, sempre dentro de [1, TOTAL_STEPS]). */
  currentStep: number
  /** `true` quando `?step=N` e valido e desbloqueado (ou ausente, retomando o progresso). */
  isValid: boolean
  /** Passo de destino quando o parametro for invalido/bloqueado; `null` quando nao ha redirect. */
  redirectTo: number | null
  /** `true` enquanto carrega o progresso persistido. */
  isLoading: boolean
  /** Mensagem de toast a ser exibida pelo consumidor; ausente em caminho feliz. */
  toastMessage?: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Le o passo persistido no localStorage do OnboardingWizard. Retorna 0 quando ausente/corrompido
 * (0 sinaliza "sem progresso" e e tratado como passo 1 pelo resolvedor).
 */
function readPersistedStepFromStorage(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.ONBOARDING)
    if (!raw) return 0
    const parsed = JSON.parse(raw) as { currentStep?: unknown }
    const step = Number(parsed?.currentStep)
    return Number.isInteger(step) && step >= 1 ? step : 0
  } catch {
    return 0
  }
}

/**
 * Converte o valor cru de `?step` em inteiro valido (>= 1). Retorna `null` para qualquer
 * valor nao inteiro, negativo, zero, string nao numerica ou decimal — todos invalidos.
 */
function parseStepParam(raw: string | null): number | null {
  if (raw === null) return null
  // Apenas digitos puros: rejeita "-1", "1.5", "1e2", "abc", " 2 ", "".
  if (!/^\d+$/.test(raw)) return null
  const n = Number.parseInt(raw, 10)
  return n >= 1 ? n : null
}

export function useOnboardingStepQuery(): OnboardingStepQueryResult {
  const searchParams = useSearchParams()
  const rawStep = searchParams.get('step')

  // null = ainda carregando o progresso persistido.
  const [persistedStep, setPersistedStep] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadPersistedStep() {
      let dbStep = 0
      try {
        const res = await fetch('/api/onboarding/state')
        if (res.ok) {
          const json = (await res.json()) as { data?: { step?: unknown } }
          const value = Number(json?.data?.step ?? 0)
          if (Number.isFinite(value)) dbStep = value
        }
      } catch {
        // DB indisponivel — cai no localStorage.
      }

      const localStep = readPersistedStepFromStorage()
      // DB e fonte de verdade quando disponivel; localStorage e fallback quando DB falha.
      const resolved = clamp(dbStep > 0 ? dbStep : Math.max(localStep, 1), 1, TOTAL_STEPS)
      if (!cancelled) setPersistedStep(resolved)
    }

    void loadPersistedStep()
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo<OnboardingStepQueryResult>(() => {
    if (persistedStep === null) {
      return { currentStep: 1, isValid: false, redirectTo: null, isLoading: true }
    }

    const requested = parseStepParam(rawStep)

    // Sem `?step`: retoma do ultimo passo persistido (caminho feliz).
    if (rawStep === null) {
      return { currentStep: persistedStep, isValid: true, redirectTo: null, isLoading: false }
    }

    // Parametro invalido (nao inteiro, zero, negativo) OU fora de faixa (> TOTAL_STEPS).
    if (requested === null || requested > TOTAL_STEPS) {
      return {
        currentStep: persistedStep,
        isValid: false,
        redirectTo: persistedStep,
        isLoading: false,
        toastMessage: ONBOARDING_STEP_TOAST.INVALID,
      }
    }

    // Pre-requisito incompleto: so e permitido saltar ate persistedStep + 1.
    const maxAllowed = Math.min(persistedStep + 1, TOTAL_STEPS)
    if (requested > maxAllowed) {
      return {
        currentStep: maxAllowed,
        isValid: false,
        redirectTo: maxAllowed,
        isLoading: false,
        toastMessage: ONBOARDING_STEP_TOAST.PREREQUISITE,
      }
    }

    // Deep-link valido e desbloqueado.
    return { currentStep: requested, isValid: true, redirectTo: null, isLoading: false }
  }, [persistedStep, rawStep])
}
