import { describe, it, expect } from 'vitest'
import {
  canTransition,
  getAvailableTransitions,
  assertValidTransition,
} from '../content-status'
import { ContentStatus } from '@/types/enums'

// Nota: ContentStatus real do Prisma = DRAFT | REVIEW | APPROVED | PENDING_ART | PUBLISHED | FAILED

describe('ContentStatus state machine', () => {
  // --- Transições válidas ---
  describe('canTransition — válidas', () => {
    it('DRAFT → REVIEW', () => expect(canTransition(ContentStatus.DRAFT, ContentStatus.REVIEW)).toBe(true))
    it('DRAFT → FAILED (erro direto)', () => expect(canTransition(ContentStatus.DRAFT, ContentStatus.FAILED)).toBe(true))
    it('REVIEW → APPROVED', () => expect(canTransition(ContentStatus.REVIEW, ContentStatus.APPROVED)).toBe(true))
    it('REVIEW → DRAFT (revisão)', () => expect(canTransition(ContentStatus.REVIEW, ContentStatus.DRAFT)).toBe(true))
    it('REVIEW → FAILED', () => expect(canTransition(ContentStatus.REVIEW, ContentStatus.FAILED)).toBe(true))
    it('APPROVED → PENDING_ART', () => expect(canTransition(ContentStatus.APPROVED, ContentStatus.PENDING_ART)).toBe(true))
    it('APPROVED → PUBLISHED (sem arte)', () => expect(canTransition(ContentStatus.APPROVED, ContentStatus.PUBLISHED)).toBe(true))
    it('APPROVED → DRAFT (regressão)', () => expect(canTransition(ContentStatus.APPROVED, ContentStatus.DRAFT)).toBe(true))
    it('PENDING_ART → APPROVED (arte pronta)', () => expect(canTransition(ContentStatus.PENDING_ART, ContentStatus.APPROVED)).toBe(true))
    it('PENDING_ART → FAILED', () => expect(canTransition(ContentStatus.PENDING_ART, ContentStatus.FAILED)).toBe(true))
    it('FAILED → DRAFT (revisitar)', () => expect(canTransition(ContentStatus.FAILED, ContentStatus.DRAFT)).toBe(true))
  })

  // --- Transições inválidas ---
  describe('canTransition — inválidas', () => {
    it('PUBLISHED → DRAFT (terminal)', () => expect(canTransition(ContentStatus.PUBLISHED, ContentStatus.DRAFT)).toBe(false))
    it('PUBLISHED → APPROVED (terminal)', () => expect(canTransition(ContentStatus.PUBLISHED, ContentStatus.APPROVED)).toBe(false))
    it('PUBLISHED → FAILED (terminal)', () => expect(canTransition(ContentStatus.PUBLISHED, ContentStatus.FAILED)).toBe(false))
    it('DRAFT → PUBLISHED (salto)', () => expect(canTransition(ContentStatus.DRAFT, ContentStatus.PUBLISHED)).toBe(false))
    it('DRAFT → APPROVED (salto)', () => expect(canTransition(ContentStatus.DRAFT, ContentStatus.APPROVED)).toBe(false))
    it('FAILED → PUBLISHED (salto)', () => expect(canTransition(ContentStatus.FAILED, ContentStatus.PUBLISHED)).toBe(false))
  })

  // --- Estado terminal ---
  describe('getAvailableTransitions', () => {
    it('PUBLISHED permite apenas ROLLED_BACK (rollback de publicacao)', () => {
      expect(getAvailableTransitions(ContentStatus.PUBLISHED)).toEqual([
        ContentStatus.ROLLED_BACK,
      ])
    })
    it('DRAFT retorna REVIEW e FAILED', () => {
      const transitions = getAvailableTransitions(ContentStatus.DRAFT)
      expect(transitions).toContain(ContentStatus.REVIEW)
      expect(transitions).toContain(ContentStatus.FAILED)
    })
    it('REVIEW retorna APPROVED, DRAFT e FAILED', () => {
      const transitions = getAvailableTransitions(ContentStatus.REVIEW)
      expect(transitions).toContain(ContentStatus.APPROVED)
      expect(transitions).toContain(ContentStatus.DRAFT)
      expect(transitions).toContain(ContentStatus.FAILED)
    })
  })

  // --- assertValidTransition ---
  describe('assertValidTransition', () => {
    it('não lança para transição válida DRAFT → REVIEW', () => {
      expect(() => assertValidTransition(ContentStatus.DRAFT, ContentStatus.REVIEW)).not.toThrow()
    })
    it('não lança para REVIEW → APPROVED', () => {
      expect(() => assertValidTransition(ContentStatus.REVIEW, ContentStatus.APPROVED)).not.toThrow()
    })
    it('lança ERR-022 para PUBLISHED → DRAFT', () => {
      expect(() => assertValidTransition(ContentStatus.PUBLISHED, ContentStatus.DRAFT))
        .toThrow(/ERR-022/)
    })
    it('lança ERR-022 para DRAFT → PUBLISHED (salto)', () => {
      expect(() => assertValidTransition(ContentStatus.DRAFT, ContentStatus.PUBLISHED))
        .toThrow(/ERR-022/)
    })
    it('lança ERR-022 para FAILED → PUBLISHED (salto)', () => {
      expect(() => assertValidTransition(ContentStatus.FAILED, ContentStatus.PUBLISHED))
        .toThrow(/ERR-022/)
    })
  })
})
