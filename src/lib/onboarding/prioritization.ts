// Priorizacao de entradas pendentes do onboarding (TASK-2 ST001, gaps CL-022/CL-023).
// Funcao pura: ordena cases+pains por potencial de destravar temas validados.

export type PendingEntryType = 'case' | 'pain'

export interface PendingCase {
  id: string
  name: string
  sector: string
  outcome: string
  hasQuantifiableResult?: boolean
}

export interface PendingPain {
  id: string
  title: string
  description: string
  sectors?: string[]
}

export interface PrioritizedEntry {
  type: PendingEntryType
  entry: PendingCase | PendingPain
  score: number
  reason: string
  themesUnlockedEstimate: number
}

const SCORE = {
  caseQuantifiable: 100,
  painWithSectors: 80,
  caseDraft: 60,
  painDraft: 50,
} as const

function scoreCase(c: PendingCase): { score: number; reason: string } {
  if (c.hasQuantifiableResult) {
    return { score: SCORE.caseQuantifiable, reason: 'quantifiable-result' }
  }
  return { score: SCORE.caseDraft, reason: 'draft' }
}

function scorePain(p: PendingPain): { score: number; reason: string } {
  if (p.sectors && p.sectors.length > 0) {
    return { score: SCORE.painWithSectors, reason: 'sectors-mapped' }
  }
  return { score: SCORE.painDraft, reason: 'draft' }
}

// Heuristica: cada case quantificavel destrava ~3 temas; pain com setor ~2; demais ~1.
// Nao depende do motor de temas real — pre-estimativa usada apenas no nudge.
export function previewThemesUnlocked(
  type: PendingEntryType,
  entry: PendingCase | PendingPain
): number {
  if (type === 'case') {
    return (entry as PendingCase).hasQuantifiableResult ? 3 : 1
  }
  const sectors = (entry as PendingPain).sectors ?? []
  return sectors.length > 0 ? 2 : 1
}

export function prioritizePendingEntries(
  cases: PendingCase[],
  pains: PendingPain[]
): PrioritizedEntry[] {
  const fromCases: PrioritizedEntry[] = cases.map((c) => {
    const s = scoreCase(c)
    return {
      type: 'case',
      entry: c,
      score: s.score,
      reason: s.reason,
      themesUnlockedEstimate: previewThemesUnlocked('case', c),
    }
  })

  const fromPains: PrioritizedEntry[] = pains.map((p) => {
    const s = scorePain(p)
    return {
      type: 'pain',
      entry: p,
      score: s.score,
      reason: s.reason,
      themesUnlockedEstimate: previewThemesUnlocked('pain', p),
    }
  })

  return [...fromCases, ...fromPains].sort((a, b) => b.score - a.score)
}
