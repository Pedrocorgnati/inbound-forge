/**
 * middleware.test.ts — TASK-13 ST001
 * Testes do onboarding guard em src/middleware.ts (gap G-003 do MILESTONE-14)
 *
 * Estratégia: a função `shouldRedirectToOnboarding` foi extraída como pure helper
 * para evitar mock pesado de Supabase/NextResponse. Cobre todas as branches do guard.
 */
import { describe, it, expect } from 'vitest'
import { shouldRedirectToOnboarding } from '@/middleware'

describe('middleware — shouldRedirectToOnboarding (onboarding guard)', () => {
  describe('dev mode bypass', () => {
    it('[BYPASS] dev mode sem cookie → não redireciona (suporta DX)', () => {
      expect(shouldRedirectToOnboarding('/pt-BR/dashboard', undefined, true)).toBe(false)
    })

    it('[BYPASS] dev mode com cookie inválido → não redireciona', () => {
      expect(shouldRedirectToOnboarding('/pt-BR/knowledge', 'anything', true)).toBe(false)
    })
  })

  describe('rotas que não passam pelo guard', () => {
    it('[BYPASS] rota /onboarding direta → não redireciona (evita loop)', () => {
      expect(shouldRedirectToOnboarding('/pt-BR/onboarding', undefined, false)).toBe(false)
    })

    it('[BYPASS] rota /onboarding com sub-path → não redireciona', () => {
      expect(shouldRedirectToOnboarding('/pt-BR/onboarding/credentials', undefined, false)).toBe(
        false,
      )
    })

    it('[BYPASS] rota /api/* → não redireciona (APIs gerenciam auth próprio)', () => {
      expect(shouldRedirectToOnboarding('/api/v1/health', undefined, false)).toBe(false)
    })

    it('[BYPASS] rota /api/v1/onboarding/progress → não redireciona', () => {
      expect(shouldRedirectToOnboarding('/api/v1/onboarding/progress', undefined, false)).toBe(
        false,
      )
    })
  })

  describe('redirect para onboarding', () => {
    it('[REDIRECT] /dashboard sem cookie → redireciona', () => {
      expect(shouldRedirectToOnboarding('/pt-BR/dashboard', undefined, false)).toBe(true)
    })

    it('[REDIRECT] /knowledge com cookie vazio → redireciona', () => {
      expect(shouldRedirectToOnboarding('/pt-BR/knowledge', '', false)).toBe(true)
    })

    it('[REDIRECT] /calendar com cookie != "1" → redireciona', () => {
      expect(shouldRedirectToOnboarding('/pt-BR/calendar', '0', false)).toBe(true)
    })

    it('[REDIRECT] cobre todos os 4 locales suportados', () => {
      for (const locale of ['pt-BR', 'en-US', 'it-IT', 'es-ES']) {
        expect(shouldRedirectToOnboarding(`/${locale}/dashboard`, undefined, false)).toBe(true)
      }
    })
  })

  describe('passa adiante (cookie válido)', () => {
    it('[PASS] /dashboard com cookie="1" → não redireciona', () => {
      expect(shouldRedirectToOnboarding('/pt-BR/dashboard', '1', false)).toBe(false)
    })

    it('[PASS] /knowledge com cookie="1" → não redireciona', () => {
      expect(shouldRedirectToOnboarding('/pt-BR/knowledge', '1', false)).toBe(false)
    })

    it('[PASS] cobre todos os 4 locales com cookie válido', () => {
      for (const locale of ['pt-BR', 'en-US', 'it-IT', 'es-ES']) {
        expect(shouldRedirectToOnboarding(`/${locale}/analytics`, '1', false)).toBe(false)
      }
    })
  })

  describe('edge cases', () => {
    it('[EDGE] path vazio sem locale, sem cookie, prod → redireciona', () => {
      expect(shouldRedirectToOnboarding('/dashboard', undefined, false)).toBe(true)
    })

    it('[EDGE] cookie value "true" (não é "1") → redireciona (estrito)', () => {
      expect(shouldRedirectToOnboarding('/pt-BR/dashboard', 'true', false)).toBe(true)
    })

    it('[EDGE] cookie value "yes" (não é "1") → redireciona (estrito)', () => {
      expect(shouldRedirectToOnboarding('/pt-BR/dashboard', 'yes', false)).toBe(true)
    })

    it('[EDGE] /onboarding-fake (não match prefixo) → redireciona', () => {
      expect(shouldRedirectToOnboarding('/pt-BR/onboarding-fake', undefined, false)).toBe(true)
    })
  })
})
