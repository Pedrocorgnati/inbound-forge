import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { OnboardingProgress } from '../OnboardingProgress'

describe('OnboardingProgress', () => {
  it('renderiza o número correto de dots', () => {
    const { getAllByTestId } = render(
      <OnboardingProgress currentStep={1} totalSteps={4} completedSteps={[]} />
    )
    expect(getAllByTestId(/progress-dot-/)).toHaveLength(4)
  })

  it('passo atual tem classe border-primary', () => {
    const { getByTestId } = render(
      <OnboardingProgress currentStep={2} totalSteps={4} completedSteps={[1]} />
    )
    const currentDot = getByTestId('progress-dot-2')
    expect(currentDot.className).toContain('border-primary')
  })

  it('passo concluído exibe ícone Check', () => {
    const { getByTestId } = render(
      <OnboardingProgress currentStep={2} totalSteps={4} completedSteps={[1]} />
    )
    const completedDot = getByTestId('progress-dot-1')
    expect(completedDot.querySelector('[aria-label="Concluído"]')).not.toBeNull()
  })

  it('passo pendente exibe número do step', () => {
    const { getByTestId } = render(
      <OnboardingProgress currentStep={1} totalSteps={3} completedSteps={[]} />
    )
    expect(getByTestId('progress-dot-3').textContent).toBe('3')
  })

  it('tem role progressbar com aria-valuenow correto', () => {
    const { getByRole } = render(
      <OnboardingProgress currentStep={3} totalSteps={5} completedSteps={[1, 2]} />
    )
    const progressbar = getByRole('progressbar')
    expect(progressbar.getAttribute('aria-valuenow')).toBe('3')
    expect(progressbar.getAttribute('aria-valuemin')).toBe('1')
    expect(progressbar.getAttribute('aria-valuemax')).toBe('5')
  })

  it('aria-label reflete o passo atual', () => {
    const { getByRole } = render(
      <OnboardingProgress currentStep={2} totalSteps={4} completedSteps={[1]} />
    )
    expect(getByRole('progressbar').getAttribute('aria-label')).toBe('Passo 2 de 4')
  })

  it('não renderiza linha conectora após o último passo', () => {
    const { container } = render(
      <OnboardingProgress currentStep={1} totalSteps={3} completedSteps={[]} />
    )
    // 3 steps → 2 connectors
    const connectors = container.querySelectorAll('.h-0\\.5')
    expect(connectors).toHaveLength(2)
  })

  it('todos os passos completados mostram bg-primary', () => {
    const { getAllByTestId } = render(
      <OnboardingProgress currentStep={4} totalSteps={4} completedSteps={[1, 2, 3, 4]} />
    )
    getAllByTestId(/progress-dot-/).forEach((dot) => {
      expect(dot.className).toContain('bg-primary')
    })
  })
})
