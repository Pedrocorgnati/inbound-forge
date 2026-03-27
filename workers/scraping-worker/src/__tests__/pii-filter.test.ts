/**
 * Tests: PII Filter
 * TASK-3 ST001 / module-6-scraping-worker
 * Cobertura: SUCCESS, ERROR, EDGE, DEGRADED
 */
import { describe, it, expect } from 'vitest'
import { detectPII, detectPIISync } from '../pii-filter'

describe('detectPII (async)', () => {
  // [SUCCESS] CPF detectado
  it('detecta CPF formatado', async () => {
    const result = await detectPII('Meu CPF é 123.456.789-09')
    expect(result.hasPII).toBe(true)
    expect(result.categories).toContain('cpf')
    expect(result.matches).toBeGreaterThanOrEqual(1)
  })

  // [SUCCESS] CNPJ detectado
  it('detecta CNPJ formatado', async () => {
    const result = await detectPII('CNPJ: 12.345.678/0001-99')
    expect(result.hasPII).toBe(true)
    expect(result.categories).toContain('cnpj')
  })

  // [SUCCESS] email detectado
  it('detecta email', async () => {
    const result = await detectPII('Entre em contato: joao@empresa.com.br')
    expect(result.hasPII).toBe(true)
    expect(result.categories).toContain('email')
  })

  // [SUCCESS] telefone detectado
  it('detecta telefone BR com parênteses', async () => {
    const result = await detectPII('Ligue: (11) 98765-4321')
    expect(result.hasPII).toBe(true)
    expect(result.categories).toContain('phone')
  })

  // [SUCCESS] CEP detectado
  it('detecta CEP formatado', async () => {
    const result = await detectPII('Endereço: CEP 01310-100')
    expect(result.hasPII).toBe(true)
    expect(result.categories).toContain('cep')
  })

  // [EDGE] múltiplos PII simultâneos
  it('detecta múltiplos tipos de PII simultaneamente', async () => {
    const text = 'CPF 123.456.789-09, email: test@test.com, tel: (11) 9999-8888'
    const result = await detectPII(text)
    expect(result.hasPII).toBe(true)
    expect(result.categories.length).toBeGreaterThanOrEqual(3)
    expect(result.categories).toContain('cpf')
    expect(result.categories).toContain('email')
    expect(result.categories).toContain('phone')
  })

  // [SUCCESS] texto limpo não detecta PII
  it('retorna hasPII=false para texto sem PII', async () => {
    const result = await detectPII('Estamos buscando melhorias no processo de gestão')
    expect(result.hasPII).toBe(false)
    expect(result.categories).toHaveLength(0)
    expect(result.matches).toBe(0)
  })

  // [DEGRADED] texto vazio
  it('retorna resultado seguro para texto vazio', async () => {
    const result = await detectPII('')
    expect(result.hasPII).toBe(false)
    expect(result.categories).toHaveLength(0)
  })

  // [ERROR] CPF sem formatação (variante simples)
  it('detecta CPF sem pontuação', async () => {
    const result = await detectPII('meu cpf 12345678909 para contato')
    expect(result.hasPII).toBe(true)
    expect(result.categories).toContain('cpf')
  })
})

describe('detectPIISync (síncrono)', () => {
  it('detecta CPF sincronamente', () => {
    const result = detectPIISync('CPF: 123.456.789-09')
    expect(result.hasPII).toBe(true)
    expect(result.categories).toContain('cpf')
  })

  it('retorna resultado vazio para texto nulo/undefined', () => {
    const result = detectPIISync('')
    expect(result.hasPII).toBe(false)
    expect(result.categories).toHaveLength(0)
  })

  it('detecta CNPJ sincronamente', () => {
    const result = detectPIISync('12.345.678/0001-99')
    expect(result.hasPII).toBe(true)
    expect(result.categories).toContain('cnpj')
  })

  it('não detecta PII em texto de negócio genérico', () => {
    const result = detectPIISync(
      'Nossa empresa precisa melhorar o processo de automação de relatórios mensais.'
    )
    expect(result.hasPII).toBe(false)
  })
})
