/**
 * Tests: PII Check Utility
 * TASK-2 ST004 / module-6-scraping-worker
 * Cobertura: SUCCESS, ERROR, EDGE, DEGRADED
 */
import { describe, it, expect } from 'vitest'
import { checkPii, sanitizeReasoning, PII_REDACTED, PII_CHECK_FAILED } from '../pii-check'

describe('checkPii', () => {
  // [SUCCESS] CPF detectado
  it('detecta CPF formatado (xxx.xxx.xxx-xx)', () => {
    const result = checkPii('Solicitante CPF 123.456.789-09')
    expect(result.hasPii).toBe(true)
    expect(result.detectedTypes).toContain('CPF')
  })

  // [SUCCESS] email detectado
  it('detecta email', () => {
    const result = checkPii('Enviar para user@empresa.com.br')
    expect(result.hasPii).toBe(true)
    expect(result.detectedTypes).toContain('EMAIL')
  })

  // [SUCCESS] telefone BR detectado
  it('detecta telefone BR com parênteses', () => {
    const result = checkPii('Ligue (11) 98765-4321')
    expect(result.hasPii).toBe(true)
    expect(result.detectedTypes).toContain('TELEFONE')
  })

  // [SUCCESS] CNPJ detectado
  it('detecta CNPJ formatado', () => {
    const result = checkPii('CNPJ da empresa: 12.345.678/0001-99')
    expect(result.hasPii).toBe(true)
    expect(result.detectedTypes).toContain('CNPJ')
  })

  // [SUCCESS] texto sem PII retorna hasPii=false
  it('retorna hasPii=false para texto de negócio genérico', () => {
    const result = checkPii('A empresa precisa melhorar os processos de automação')
    expect(result.hasPii).toBe(false)
    expect(result.detectedTypes).toHaveLength(0)
  })

  // [EDGE] múltiplos tipos detectados simultaneamente
  it('detecta múltiplos tipos de PII no mesmo texto', () => {
    const result = checkPii('CPF 123.456.789-09 email: test@test.com tel: (11) 9999-8888')
    expect(result.hasPii).toBe(true)
    expect(result.detectedTypes.length).toBeGreaterThanOrEqual(3)
  })

  // [DEGRADED] null retorna hasPii=false (sem erro)
  it('retorna hasPii=false para null sem lançar erro', () => {
    const result = checkPii(null)
    expect(result.hasPii).toBe(false)
    expect(result.detectedTypes).toHaveLength(0)
  })

  // [DEGRADED] undefined retorna hasPii=false (sem erro)
  it('retorna hasPii=false para undefined sem lançar erro', () => {
    const result = checkPii(undefined)
    expect(result.hasPii).toBe(false)
    expect(result.detectedTypes).toHaveLength(0)
  })

  // [DEGRADED] string vazia retorna hasPii=false
  it('retorna hasPii=false para string vazia', () => {
    const result = checkPii('')
    expect(result.hasPii).toBe(false)
    expect(result.detectedTypes).toHaveLength(0)
  })
})

describe('sanitizeReasoning', () => {
  // [SUCCESS] reasoning limpo não é alterado
  it('retorna reasoning original quando não há PII', () => {
    const input = 'Empresa relata dificuldade de integração entre ERP e CRM'
    expect(sanitizeReasoning(input)).toBe(input)
  })

  // [SUCCESS] reasoning com CPF é substituído inteiro
  it('substitui o reasoning inteiro quando há CPF (nunca substituição parcial)', () => {
    const result = sanitizeReasoning('Solicitante 123.456.789-09 reportou o problema')
    expect(result).toBe(PII_REDACTED)
    expect(result).not.toContain('123.456.789-09')
  })

  // [SUCCESS] reasoning com email é substituído inteiro
  it('substitui o reasoning inteiro quando há email', () => {
    const result = sanitizeReasoning('Contato via usuario@empresa.com.br foi feito')
    expect(result).toBe(PII_REDACTED)
  })

  // [DEGRADED] null retorna null sem erro
  it('retorna null para input null', () => {
    expect(sanitizeReasoning(null)).toBeNull()
  })

  // [DEGRADED] undefined retorna null sem erro
  it('retorna null para input undefined', () => {
    expect(sanitizeReasoning(undefined)).toBeNull()
  })

  // [DEGRADED] string vazia retorna string vazia
  it('retorna string vazia para input vazio', () => {
    expect(sanitizeReasoning('')).toBe('')
  })

  // [SUCCESS] constante PII_REDACTED está definida
  it('exporta PII_REDACTED como string não vazia', () => {
    expect(PII_REDACTED).toBeTruthy()
    expect(typeof PII_REDACTED).toBe('string')
  })

  // [SUCCESS] constante PII_CHECK_FAILED está definida
  it('exporta PII_CHECK_FAILED como string não vazia', () => {
    expect(PII_CHECK_FAILED).toBeTruthy()
    expect(typeof PII_CHECK_FAILED).toBe('string')
  })
})
