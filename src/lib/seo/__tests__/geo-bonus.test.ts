import { describe, it, expect } from 'vitest'
import { calculateGeoBonus, isQuestionTitle, containsQuantitativeData } from '../geo-bonus'

describe('GEO bonus (TASK-3/ST001, CL-126)', () => {
  it('detecta titulo pergunta', () => {
    expect(isQuestionTitle('Por que empresas perdem vendas?')).toBe(true)
    expect(isQuestionTitle('Como automatizar orcamentos')).toBe(true)
    expect(isQuestionTitle('Guia completo de vendas')).toBe(false)
  })

  it('detecta dado quantitativo', () => {
    expect(containsQuantitativeData('Empresas economizam 40% com automacao')).toBe(true)
    expect(containsQuantitativeData('ROI em 6 meses com CRM sob medida')).toBe(true)
    expect(containsQuantitativeData('Como escalar o time comercial')).toBe(false)
  })

  it('aplica bonus individual (pergunta)', () => {
    const r = calculateGeoBonus({ title: 'Por que suas vendas cairam?' })
    expect(r.isQuestion).toBe(true)
    expect(r.totalBonus).toBeCloseTo(0.10, 5)
  })

  it('aplica bonus combinado respeitando teto', () => {
    const r = calculateGeoBonus({ title: 'Por que 50% das PMEs perdem vendas vs concorrentes' })
    expect(r.isQuestion).toBe(true)
    expect(r.hasData).toBe(true)
    expect(r.isComparison).toBe(true)
    expect(r.totalBonus).toBeLessThanOrEqual(0.25)
    expect(r.totalBonus).toBeCloseTo(0.25, 5)
  })

  it('retorna zero quando nenhum criterio se aplica', () => {
    const r = calculateGeoBonus({ title: 'Guia completo de vendas consultivas' })
    expect(r.totalBonus).toBe(0)
  })
})
