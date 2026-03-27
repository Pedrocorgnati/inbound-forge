import { describe, it, expect } from 'vitest'
import {
  canTransition,
  getAvailableTransitions,
  assertValidTransition,
} from '../theme-status'
import { ThemeStatus } from '@/types/enums'

// Nota: ThemeStatus real do Prisma = ACTIVE | DEPRIORITIZED | REJECTED

describe('ThemeStatus state machine', () => {
  // --- Transições válidas ---
  describe('canTransition — válidas', () => {
    it('ACTIVE → DEPRIORITIZED', () => expect(canTransition(ThemeStatus.ACTIVE, ThemeStatus.DEPRIORITIZED)).toBe(true))
    it('ACTIVE → REJECTED', () => expect(canTransition(ThemeStatus.ACTIVE, ThemeStatus.REJECTED)).toBe(true))
    it('DEPRIORITIZED → ACTIVE (reativar)', () => expect(canTransition(ThemeStatus.DEPRIORITIZED, ThemeStatus.ACTIVE)).toBe(true))
    it('DEPRIORITIZED → REJECTED', () => expect(canTransition(ThemeStatus.DEPRIORITIZED, ThemeStatus.REJECTED)).toBe(true))
    it('REJECTED → ACTIVE (reativar)', () => expect(canTransition(ThemeStatus.REJECTED, ThemeStatus.ACTIVE)).toBe(true))
  })

  // --- Transições inválidas ---
  describe('canTransition — inválidas', () => {
    it('ACTIVE → ACTIVE (mesmo estado)', () => expect(canTransition(ThemeStatus.ACTIVE, ThemeStatus.ACTIVE)).toBe(false))
    it('REJECTED → DEPRIORITIZED (salto)', () => expect(canTransition(ThemeStatus.REJECTED, ThemeStatus.DEPRIORITIZED)).toBe(false))
    it('DEPRIORITIZED → DEPRIORITIZED (mesmo estado)', () => expect(canTransition(ThemeStatus.DEPRIORITIZED, ThemeStatus.DEPRIORITIZED)).toBe(false))
  })

  // --- getAvailableTransitions ---
  describe('getAvailableTransitions', () => {
    it('ACTIVE retorna DEPRIORITIZED e REJECTED', () => {
      const transitions = getAvailableTransitions(ThemeStatus.ACTIVE)
      expect(transitions).toContain(ThemeStatus.DEPRIORITIZED)
      expect(transitions).toContain(ThemeStatus.REJECTED)
    })
    it('REJECTED retorna apenas ACTIVE', () => {
      const transitions = getAvailableTransitions(ThemeStatus.REJECTED)
      expect(transitions).toEqual([ThemeStatus.ACTIVE])
    })
  })

  // --- assertValidTransition ---
  describe('assertValidTransition', () => {
    it('não lança para ACTIVE → DEPRIORITIZED', () => {
      expect(() => assertValidTransition(ThemeStatus.ACTIVE, ThemeStatus.DEPRIORITIZED)).not.toThrow()
    })
    it('não lança para REJECTED → ACTIVE', () => {
      expect(() => assertValidTransition(ThemeStatus.REJECTED, ThemeStatus.ACTIVE)).not.toThrow()
    })
    it('lança ERR-022 para REJECTED → DEPRIORITIZED', () => {
      expect(() => assertValidTransition(ThemeStatus.REJECTED, ThemeStatus.DEPRIORITIZED))
        .toThrow(/ERR-022/)
    })
    it('lança ERR-022 para ACTIVE → ACTIVE', () => {
      expect(() => assertValidTransition(ThemeStatus.ACTIVE, ThemeStatus.ACTIVE))
        .toThrow(/ERR-022/)
    })
  })
})
