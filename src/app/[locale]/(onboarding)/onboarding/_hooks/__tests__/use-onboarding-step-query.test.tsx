// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useOnboardingStepQuery,
  ONBOARDING_STEP_TOAST,
  TOTAL_STEPS,
} from '../use-onboarding-step-query'

// ── Mock next/navigation: useSearchParams controlado por variavel de teste ──
let mockStep: string | null = null
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockStep === null ? '' : `step=${mockStep}`),
}))

// ── localStorage mock ──
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v
    },
    removeItem: (k: string) => {
      delete store[k]
    },
    clear: () => {
      store = {}
    },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

/** Helper: mocka GET /api/onboarding/state retornando o step de DB informado. */
function mockDbStep(step: number, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: async () => ({ success: true, data: { step } }),
  }) as unknown as typeof fetch
}

describe('useOnboardingStepQuery', () => {
  beforeEach(() => {
    mockStep = null
    localStorageMock.clear()
    mockDbStep(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('inicia em isLoading=true antes de resolver o progresso', () => {
    mockStep = '2'
    const { result } = renderHook(() => useOnboardingStepQuery())
    expect(result.current.isLoading).toBe(true)
  })

  it('sem ?step: retoma do passo persistido no DB', async () => {
    mockStep = null
    mockDbStep(3)
    const { result } = renderHook(() => useOnboardingStepQuery())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.currentStep).toBe(3)
    expect(result.current.isValid).toBe(true)
    expect(result.current.redirectTo).toBeNull()
    expect(result.current.toastMessage).toBeUndefined()
  })

  it('sem ?step e sem progresso: retoma do passo 1', async () => {
    mockStep = null
    mockDbStep(0)
    const { result } = renderHook(() => useOnboardingStepQuery())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.currentStep).toBe(1)
    expect(result.current.isValid).toBe(true)
  })

  it('?step valido e desbloqueado: salta para o passo', async () => {
    mockStep = '2'
    mockDbStep(3) // persistido ate 3 → pode acessar 1..4
    const { result } = renderHook(() => useOnboardingStepQuery())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.currentStep).toBe(2)
    expect(result.current.isValid).toBe(true)
    expect(result.current.redirectTo).toBeNull()
  })

  it('?step com pre-requisito incompleto: redireciona para persistido+1 com toast', async () => {
    mockStep = '5'
    mockDbStep(2) // persistido ate 2 → max permitido = 3
    const { result } = renderHook(() => useOnboardingStepQuery())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isValid).toBe(false)
    expect(result.current.redirectTo).toBe(3)
    expect(result.current.currentStep).toBe(3)
    expect(result.current.toastMessage).toBe(ONBOARDING_STEP_TOAST.PREREQUISITE)
  })

  it('?step=0 (zero) e invalido: redireciona para persistido com toast', async () => {
    mockStep = '0'
    mockDbStep(2)
    const { result } = renderHook(() => useOnboardingStepQuery())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isValid).toBe(false)
    expect(result.current.redirectTo).toBe(2)
    expect(result.current.toastMessage).toBe(ONBOARDING_STEP_TOAST.INVALID)
  })

  it('?step negativo e invalido', async () => {
    mockStep = '-1'
    mockDbStep(2)
    const { result } = renderHook(() => useOnboardingStepQuery())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isValid).toBe(false)
    expect(result.current.toastMessage).toBe(ONBOARDING_STEP_TOAST.INVALID)
  })

  it('?step string nao numerica e invalido', async () => {
    mockStep = 'abc'
    mockDbStep(2)
    const { result } = renderHook(() => useOnboardingStepQuery())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isValid).toBe(false)
    expect(result.current.toastMessage).toBe(ONBOARDING_STEP_TOAST.INVALID)
  })

  it('?step decimal e invalido', async () => {
    mockStep = '2.5'
    mockDbStep(3)
    const { result } = renderHook(() => useOnboardingStepQuery())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isValid).toBe(false)
    expect(result.current.toastMessage).toBe(ONBOARDING_STEP_TOAST.INVALID)
  })

  it('?step maior que TOTAL_STEPS e invalido', async () => {
    mockStep = String(TOTAL_STEPS + 1)
    mockDbStep(TOTAL_STEPS)
    const { result } = renderHook(() => useOnboardingStepQuery())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isValid).toBe(false)
    expect(result.current.redirectTo).toBe(TOTAL_STEPS)
    expect(result.current.toastMessage).toBe(ONBOARDING_STEP_TOAST.INVALID)
  })

  it('fallback localStorage quando DB indisponivel', async () => {
    mockStep = '3'
    global.fetch = vi.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
    localStorageMock.setItem(
      'inbound-forge-onboarding',
      JSON.stringify({ currentStep: 4, completedSteps: [], skippedSteps: [], credentialResults: [] })
    )
    const { result } = renderHook(() => useOnboardingStepQuery())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    // persistido=4 (localStorage) → step 3 e valido
    expect(result.current.currentStep).toBe(3)
    expect(result.current.isValid).toBe(true)
  })
})
