import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoisted Mocks ───────────────────────────────────────────────────────────

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    theme: {
      findUnique: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { KnowledgeContextService } from '../knowledge-context.service'
import type { KnowledgeContext } from '@/lib/types/content-generation.types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const THEME_ID = 'theme-uuid-001'

function makeTheme(overrides: Record<string, unknown> = {}) {
  return {
    id: THEME_ID,
    title: 'Automacao de Processos',
    pain: {
      id: 'pain-001',
      title: 'Processos manuais',
      description: 'Erros humanos recorrentes em operacoes manuais',
    },
    case: {
      id: 'case-001',
      name: 'Case Alpha Corp',
      outcome: 'Reducao de 40% no tempo de processamento apos automacao completa do fluxo de pedidos.',
    },
    solutionPattern: {
      id: 'pattern-001',
      name: 'Workflow Automation',
      description: 'Automacao de workflows com triggers e acoes condicionais',
    },
    ...overrides,
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('KnowledgeContextService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── buildContext() ──────────────────────────────────────────────────────

  describe('buildContext()', () => {
    it('returns pains, cases, and patterns from full theme data', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(makeTheme())

      const context = await KnowledgeContextService.buildContext(THEME_ID)

      expect(context.theme).toEqual({ id: THEME_ID, title: 'Automacao de Processos' })
      expect(context.pains).toHaveLength(1)
      expect(context.pains[0].title).toBe('Processos manuais')
      expect(context.cases).toHaveLength(1)
      expect(context.cases[0].title).toBe('Case Alpha Corp')
      expect(context.patterns).toHaveLength(1)
      expect(context.patterns[0].title).toBe('Workflow Automation')
    })

    it('returns empty arrays when theme has no relations', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(
        makeTheme({ pain: null, case: null, solutionPattern: null })
      )

      const context = await KnowledgeContextService.buildContext(THEME_ID)

      expect(context.pains).toEqual([])
      expect(context.cases).toEqual([])
      expect(context.patterns).toEqual([])
    })

    it('truncates case outcome to 300 chars', async () => {
      const longOutcome = 'A'.repeat(500)
      mockPrisma.theme.findUnique.mockResolvedValue(
        makeTheme({
          case: { id: 'case-001', name: 'Long Case', outcome: longOutcome },
        })
      )

      const context = await KnowledgeContextService.buildContext(THEME_ID)

      expect(context.cases[0].result.length).toBe(300)
    })

    it('throws Error when theme not found', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(null)

      await expect(
        KnowledgeContextService.buildContext(THEME_ID)
      ).rejects.toThrow(/não encontrado/)
    })
  })

  // ─── hasMinimumContent() ─────────────────────────────────────────────────

  describe('hasMinimumContent()', () => {
    it('returns false when pains and cases are empty', () => {
      const context: KnowledgeContext = {
        theme: { id: THEME_ID, title: 'Test' },
        pains: [],
        cases: [],
        patterns: [],
      }

      expect(KnowledgeContextService.hasMinimumContent(context)).toBe(false)
    })

    it('returns true when at least one pain exists', () => {
      const context: KnowledgeContext = {
        theme: { id: THEME_ID, title: 'Test' },
        pains: [{ id: 'p1', title: 'Dor 1', description: 'Desc' }],
        cases: [],
        patterns: [],
      }

      expect(KnowledgeContextService.hasMinimumContent(context)).toBe(true)
    })

    it('returns true when at least one case exists (no pains)', () => {
      const context: KnowledgeContext = {
        theme: { id: THEME_ID, title: 'Test' },
        pains: [],
        cases: [{ id: 'c1', title: 'Case 1', result: 'Result' }],
        patterns: [],
      }

      expect(KnowledgeContextService.hasMinimumContent(context)).toBe(true)
    })

    it('returns true when both pains and cases exist', () => {
      const context: KnowledgeContext = {
        theme: { id: THEME_ID, title: 'Test' },
        pains: [{ id: 'p1', title: 'Dor 1', description: 'Desc' }],
        cases: [{ id: 'c1', title: 'Case 1', result: 'Result' }],
        patterns: [{ id: 'pt1', title: 'Pattern', description: 'Desc' }],
      }

      expect(KnowledgeContextService.hasMinimumContent(context)).toBe(true)
    })

    it('returns false when only patterns exist (no pains, no cases)', () => {
      const context: KnowledgeContext = {
        theme: { id: THEME_ID, title: 'Test' },
        pains: [],
        cases: [],
        patterns: [{ id: 'pt1', title: 'Pattern', description: 'Desc' }],
      }

      expect(KnowledgeContextService.hasMinimumContent(context)).toBe(false)
    })
  })
})
