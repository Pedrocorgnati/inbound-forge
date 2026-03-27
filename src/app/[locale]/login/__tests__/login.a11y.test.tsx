import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import React from 'react'

expect.extend(toHaveNoViolations)

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

// Mock supabase client
vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    },
  }),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Import after mocks
import { LoginForm } from '@/components/auth/login-form'

describe('LoginForm - Acessibilidade (A11Y-001)', () => {
  it('não deve ter violações axe-core critical/serious (WCAG 2.1 AA)', async () => {
    const { container } = render(<LoginForm locale="pt-BR" />)
    const results = await axe(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    })
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    )
    expect(criticalViolations).toHaveLength(0)
  })

  it('deve ter label associado ao input de email', () => {
    const { getByLabelText } = render(<LoginForm locale="pt-BR" />)
    expect(getByLabelText(/e-mail/i)).toBeDefined()
  })

  it('deve ter label associado ao input de senha', () => {
    const { getByLabelText } = render(<LoginForm locale="pt-BR" />)
    expect(getByLabelText(/senha/i)).toBeDefined()
  })

  it('deve ter botão de submit identificado', () => {
    const { getByRole } = render(<LoginForm locale="pt-BR" />)
    expect(getByRole('button', { name: /entrar/i })).toBeDefined()
  })

  it('deve ter aria-label no formulário', () => {
    const { container } = render(<LoginForm locale="pt-BR" />)
    const form = container.querySelector('form')
    expect(form?.getAttribute('aria-label')).toBe('Formulário de login')
  })

  it('deve ter aria-busy no form', () => {
    const { container } = render(<LoginForm locale="pt-BR" />)
    const form = container.querySelector('form')
    expect(form).toHaveAttribute('aria-busy')
  })

  it('deve ter aria-live region para anúncios', () => {
    const { container } = render(<LoginForm locale="pt-BR" />)
    const liveRegion = container.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeDefined()
    expect(liveRegion?.classList.contains('sr-only')).toBe(true)
  })

  it('deve ter toggle de senha com aria-label', () => {
    const { getByLabelText } = render(<LoginForm locale="pt-BR" />)
    expect(getByLabelText(/mostrar senha/i)).toBeDefined()
  })

  it('inputs devem ter min-h-[44px] para touch targets', () => {
    const { container } = render(<LoginForm locale="pt-BR" />)
    const inputs = container.querySelectorAll('input')
    inputs.forEach((input) => {
      expect(input.className).toContain('min-h-[44px]')
    })
  })

  it('botão de toggle de senha deve ter touch target >= 44px (WCAG 2.5.5)', () => {
    const { getByTestId } = render(<LoginForm locale="pt-BR" />)
    const toggleBtn = getByTestId('form-login-show-password-button')
    expect(toggleBtn.className).toContain('min-h-[44px]')
    expect(toggleBtn.className).toContain('min-w-[44px]')
  })
})
