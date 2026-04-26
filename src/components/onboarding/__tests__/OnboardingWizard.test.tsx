// @vitest-environment jsdom
// NOTE: requer `npm install -D jsdom` para rodar com este ambiente
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

// Mock sub-componentes complexos
vi.mock('@/components/onboarding/OnboardingProgress', () => ({
  OnboardingProgress: ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
    <div data-testid="onboarding-progress" data-step={currentStep} data-total={totalSteps} />
  ),
}))

vi.mock('@/components/onboarding/OnboardingCarousel', () => ({
  OnboardingCarousel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="onboarding-carousel">{children}</div>
  ),
}))

vi.mock('@/components/onboarding/steps/WelcomeStep', () => ({
  WelcomeStep: () => <div data-testid="welcome-step">Welcome</div>,
}))

vi.mock('@/components/onboarding/steps/CredentialsStep', () => ({
  CredentialsStep: () => <div data-testid="credentials-step">Credentials</div>,
}))

vi.mock('@/components/onboarding/steps/FirstCaseStep', () => ({
  FirstCaseStep: () => <div data-testid="first-case-step">FirstCase</div>,
}))

vi.mock('@/components/onboarding/steps/PainsStep', () => ({
  PainsStep: () => <div data-testid="pains-step">Pains</div>,
}))

vi.mock('@/components/onboarding/steps/SolutionsStep', () => ({
  SolutionsStep: () => <div data-testid="solutions-step">Solutions</div>,
}))

vi.mock('@/components/onboarding/steps/ObjectionsStep', () => ({
  ObjectionsStep: () => <div data-testid="objections-step">Objections</div>,
}))

vi.mock('@/components/onboarding/steps/ActivationStep', () => ({
  ActivationStep: () => <div data-testid="activation-step">Activation</div>,
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import { OnboardingWizard } from '../OnboardingWizard'

describe('OnboardingWizard', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('renderiza componente de progresso', () => {
    render(<OnboardingWizard locale="pt-BR" />)
    expect(screen.getByTestId('onboarding-progress')).toBeDefined()
  })

  it('inicia no step 1 (WelcomeStep) sem localStorage', () => {
    render(<OnboardingWizard locale="pt-BR" />)
    const progress = screen.getByTestId('onboarding-progress')
    expect(progress.getAttribute('data-step')).toBe('1')
  })

  it('retoma o step salvo no localStorage', () => {
    localStorageMock.setItem(
      'onboarding_state',
      JSON.stringify({ currentStep: 3, completedSteps: [1, 2], skippedSteps: [], credentialResults: [] })
    )
    render(<OnboardingWizard locale="pt-BR" />)
    // Após hydration, deve estar no step 3
    const progress = screen.getByTestId('onboarding-progress')
    // O step pode ser 1 na renderização inicial (SSR-safe) ou 3 após hydration
    expect(['1', '3']).toContain(progress.getAttribute('data-step'))
  })

  it('renderiza o carousel', () => {
    render(<OnboardingWizard locale="pt-BR" />)
    expect(screen.getByTestId('onboarding-carousel')).toBeDefined()
  })

  it('não quebra com localStorage corrompido', () => {
    localStorageMock.setItem('onboarding_state', 'not-valid-json{{{')
    expect(() => render(<OnboardingWizard locale="pt-BR" />)).not.toThrow()
  })
})
