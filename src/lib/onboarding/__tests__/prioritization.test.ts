import { describe, it, expect } from 'vitest'
import {
  prioritizePendingEntries,
  previewThemesUnlocked,
  type PendingCase,
  type PendingPain,
} from '../prioritization'

describe('prioritizePendingEntries', () => {
  it('prioriza cases com resultado quantificavel primeiro', () => {
    const cases: PendingCase[] = [
      { id: 'c1', name: 'A', sector: 'saas', outcome: 'x', hasQuantifiableResult: false },
      { id: 'c2', name: 'B', sector: 'saas', outcome: 'y', hasQuantifiableResult: true },
    ]
    const r = prioritizePendingEntries(cases, [])
    expect(r[0].entry.id).toBe('c2')
  })

  it('ordena: case-quantifiable > pain-com-setores > case-draft > pain-draft', () => {
    const cases: PendingCase[] = [
      { id: 'c1', name: 'Draft', sector: 's', outcome: 'o' },
      { id: 'c2', name: 'Quant', sector: 's', outcome: 'o', hasQuantifiableResult: true },
    ]
    const pains: PendingPain[] = [
      { id: 'p1', title: 'WithSectors', description: 'd', sectors: ['varejo'] },
      { id: 'p2', title: 'Empty', description: 'd', sectors: [] },
    ]
    const r = prioritizePendingEntries(cases, pains)
    expect(r.map((e) => e.entry.id)).toEqual(['c2', 'p1', 'c1', 'p2'])
  })

  it('previewThemesUnlocked estima segundo tipo', () => {
    expect(
      previewThemesUnlocked('case', { id: 'c', name: 'n', sector: 's', outcome: 'o', hasQuantifiableResult: true })
    ).toBe(3)
    expect(previewThemesUnlocked('pain', { id: 'p', title: 't', description: 'd', sectors: ['x'] })).toBe(2)
    expect(previewThemesUnlocked('pain', { id: 'p', title: 't', description: 'd', sectors: [] })).toBe(1)
  })
})
