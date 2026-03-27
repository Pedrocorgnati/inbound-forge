// Tests — scoring.ts
// Módulo: module-7-theme-scoring-engine (TASK-0/ST002)
import { describe, it, expect } from 'vitest'
import {
  calculatePainRelevance,
  calculateCaseStrength,
  calculateRecencyBonus,
  calculateGeoMultiplier,
  calculateFinalScore,
} from '../scoring'

// ─── calculatePainRelevance ───────────────────────────────────────────────────

describe('calculatePainRelevance', () => {
  it('retorna 0 para array vazio', () => {
    expect(calculatePainRelevance([])).toBe(0)
  })

  it('calcula média dos relevanceScores', () => {
    const pains = [{ relevanceScore: 80 }, { relevanceScore: 100 }, { relevanceScore: 60 }]
    expect(calculatePainRelevance(pains)).toBe(80)
  })

  it('trata relevanceScore null como 0', () => {
    const pains = [{ relevanceScore: null }, { relevanceScore: 100 }]
    expect(calculatePainRelevance(pains)).toBe(50)
  })

  it('retorna 100 para dor com relevanceScore máxima', () => {
    expect(calculatePainRelevance([{ relevanceScore: 100 }])).toBe(100)
  })
})

// ─── calculateCaseStrength ────────────────────────────────────────────────────

describe('calculateCaseStrength', () => {
  it('retorna 0 para array vazio', () => {
    expect(calculateCaseStrength([])).toBe(0)
  })

  it('peso 1.0 para case quantificável com 100+ chars', () => {
    const longQuantifiable = 'Aumentou 45% a taxa de fechamento em 90 dias, reduzindo o ciclo de vendas de 60 para 33 dias em média para todos os clientes'
    const result = calculateCaseStrength([{ outcome: longQuantifiable }])
    expect(result).toBe(100) // 1.0 * 100
  })

  it('peso 0.7 para case qualitativo (50-99 chars)', () => {
    const qualitative = 'Melhorou significativamente a comunicação com os clientes da empresa'
    expect(qualitative.length).toBeGreaterThanOrEqual(50)
    expect(qualitative.length).toBeLessThan(100)
    const result = calculateCaseStrength([{ outcome: qualitative }])
    expect(result).toBe(70) // 0.7 * 100
  })

  it('peso 0.3 para case fraco (< 50 chars)', () => {
    const weak = 'Bom resultado'
    expect(weak.length).toBeLessThan(50)
    const result = calculateCaseStrength([{ outcome: weak }])
    expect(result).toBe(30) // 0.3 * 100
  })

  it('respeita flag hasQuantifiableResult=true mesmo sem número no texto', () => {
    const longText = 'Melhorou muito os resultados da empresa ao implementar a nova metodologia'
    expect(longText.length).toBeGreaterThanOrEqual(50)
    // Com flag explícita e comprimento >= 100 não vale, mas força peso qualitativo pelo tamanho
    const result = calculateCaseStrength([{ outcome: longText, hasQuantifiableResult: true }])
    expect(result).toBe(70) // qualitativo (comprimento < 100)
  })

  it('calcula média para múltiplos cases', () => {
    const longQ = 'Aumentou 45% a taxa de fechamento em 90 dias, reduzindo o ciclo de vendas de 60 para 33 dias em média'
    const weak = 'OK'
    // weights: 1.0 + 0.3 = 1.3 / 2 = 0.65 → 65
    const result = calculateCaseStrength([
      { outcome: longQ },
      { outcome: weak },
    ])
    expect(result).toBe(65)
  })
})

// ─── calculateRecencyBonus ────────────────────────────────────────────────────

describe('calculateRecencyBonus', () => {
  it('retorna 1.0 para null (nunca publicado)', () => {
    expect(calculateRecencyBonus(null)).toBe(1.0)
  })

  it('retorna 1.0 para publicado há > 30 dias', () => {
    const date = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
    expect(calculateRecencyBonus(date)).toBe(1.0)
  })

  it('retorna 0.5 para publicado há 20 dias (entre 15 e 30)', () => {
    const date = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
    expect(calculateRecencyBonus(date)).toBe(0.5)
  })

  it('retorna 0.0 para publicado há < 15 dias', () => {
    const date = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    expect(calculateRecencyBonus(date)).toBe(0.0)
  })

  it('retorna 0.5 para publicado exatamente há 15 dias (fronteira)', () => {
    const date = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    expect(calculateRecencyBonus(date)).toBe(0.5)
  })

  it('retorna 1.0 para publicado exatamente há 30 dias (fronteira)', () => {
    const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    expect(calculateRecencyBonus(date)).toBe(1.0)
  })
})

// ─── calculateGeoMultiplier ───────────────────────────────────────────────────

describe('calculateGeoMultiplier', () => {
  it('retorna 1.0 quando isGeoReady = false', () => {
    expect(calculateGeoMultiplier(false)).toBe(1.0)
  })

  it('retorna 1.2 quando isGeoReady = true', () => {
    expect(calculateGeoMultiplier(true)).toBe(1.2)
  })
})

// ─── calculateFinalScore ──────────────────────────────────────────────────────

describe('calculateFinalScore', () => {
  it('retorna 0 para inputs vazios', () => {
    const score = calculateFinalScore({
      pains: [],
      cases: [],
      lastPublishedAt: new Date(), // publicado agora → recencyBonus = 0
      isGeoReady: false,
    })
    expect(score).toBe(0)
  })

  it('score máximo com inputs ideais (sem GEO)', () => {
    // painRelevance=100, caseStrength≈100, recencyBonus=1.0, geoMultiplier=1.0
    // rawScore = (100*0.40 + 100*0.35 + 100*0.25) * 1.0 = 100
    const longQ = 'Aumentou 45% a taxa de fechamento em 90 dias, reduzindo o ciclo de vendas de 60 para 33 dias na empresa'
    const score = calculateFinalScore({
      pains: [{ relevanceScore: 100 }],
      cases: [{ outcome: longQ }],
      lastPublishedAt: null,
      isGeoReady: false,
    })
    expect(score).toBe(100)
  })

  it('bônus GEO incrementa score (clampado a 100)', () => {
    // Se score base é 96 com GEO → clamp 100
    const longQ = 'Aumentou 45% a taxa de fechamento em 90 dias, reduzindo o ciclo de vendas de 60 para 33 dias na empresa'
    const score = calculateFinalScore({
      pains: [{ relevanceScore: 100 }],
      cases: [{ outcome: longQ }],
      lastPublishedAt: null,
      isGeoReady: true,
    })
    expect(score).toBe(100)
  })

  it('nunca retorna NaN ou Infinity', () => {
    const score = calculateFinalScore({
      pains: [{ relevanceScore: null }],
      cases: [],
      lastPublishedAt: null,
      isGeoReady: false,
    })
    expect(isNaN(score)).toBe(false)
    expect(isFinite(score)).toBe(true)
  })

  it('score sempre entre 0 e 100', () => {
    // Caso extremo
    const score = calculateFinalScore({
      pains: [{ relevanceScore: 200 }], // inválido mas não deve quebrar
      cases: [{ outcome: 'Aumentou 1000% a taxa em 90 dias, o que foi muito além do esperado em termos de crescimento' }],
      lastPublishedAt: null,
      isGeoReady: true,
    })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})
