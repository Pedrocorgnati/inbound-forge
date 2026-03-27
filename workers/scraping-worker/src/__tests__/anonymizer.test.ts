/**
 * Tests: Anonymizer
 * TASK-3 ST002 / module-6-scraping-worker
 * Cobertura: SUCCESS, ERROR, EDGE, DEGRADED
 */
import { describe, it, expect } from 'vitest'
import { anonymize } from '../anonymizer'

describe('anonymize', () => {
  // [SUCCESS] CPF substituído por placeholder
  it('substitui CPF por [CPF_REMOVIDO]', () => {
    const result = anonymize('Meu CPF é 123.456.789-09 para cadastro.')
    expect(result.processedText).not.toContain('123.456.789-09')
    expect(result.processedText).toContain('[CPF_REMOVIDO]')
    expect(result.piiCategories).toContain('cpf')
  })

  // [SUCCESS] CNPJ substituído por placeholder
  it('substitui CNPJ por [CNPJ_REMOVIDO]', () => {
    const result = anonymize('Empresa: 12.345.678/0001-99')
    expect(result.processedText).not.toContain('12.345.678/0001-99')
    expect(result.processedText).toContain('[CNPJ_REMOVIDO]')
    expect(result.piiCategories).toContain('cnpj')
  })

  // [SUCCESS] email substituído por placeholder
  it('substitui email por [EMAIL_REMOVIDO]', () => {
    const result = anonymize('Contato: joao@empresa.com.br')
    expect(result.processedText).not.toContain('joao@empresa.com.br')
    expect(result.processedText).toContain('[EMAIL_REMOVIDO]')
    expect(result.piiCategories).toContain('email')
  })

  // [SUCCESS] telefone substituído por placeholder
  it('substitui telefone por [TELEFONE_REMOVIDO]', () => {
    const result = anonymize('Ligue: (11) 98765-4321')
    expect(result.processedText).not.toContain('98765-4321')
    expect(result.processedText).toContain('[TELEFONE_REMOVIDO]')
    expect(result.piiCategories).toContain('phone')
  })

  // [SUCCESS] CEP substituído por placeholder
  it('substitui CEP por [CEP_REMOVIDO]', () => {
    const result = anonymize('Endereço: CEP 01310-100')
    expect(result.processedText).not.toContain('01310-100')
    expect(result.processedText).toContain('[CEP_REMOVIDO]')
    expect(result.piiCategories).toContain('cep')
  })

  // [SUCCESS] texto sem PII não é modificado
  it('retorna processedText inalterado para texto sem PII', () => {
    const input = 'Estamos buscando melhorias no processo de gestão'
    const result = anonymize(input)
    expect(result.processedText).toBe(input)
    expect(result.piiCategories).toHaveLength(0)
  })

  // [EDGE] múltiplos tipos de PII simultaneamente
  it('substitui múltiplos tipos de PII no mesmo texto', () => {
    const input = 'CPF 123.456.789-09, email: test@test.com, tel: (11) 9999-8888'
    const result = anonymize(input)
    expect(result.processedText).not.toContain('123.456.789-09')
    expect(result.processedText).not.toContain('test@test.com')
    expect(result.processedText).not.toContain('9999-8888')
    expect(result.piiCategories.length).toBeGreaterThanOrEqual(3)
  })

  // [DEGRADED] string vazia retorna seguro
  it('retorna processedText vazio para string vazia', () => {
    const result = anonymize('')
    expect(result.processedText).toBe('')
    expect(result.piiCategories).toHaveLength(0)
  })

  // [EDGE] texto grande (> 50KB) processado em chunks
  it('processa texto maior que 50KB em chunks sem perder dados', () => {
    // Gera ~55KB de texto com CPF no meio
    const padding = 'a'.repeat(26 * 1024)
    const input = padding + ' CPF: 123.456.789-09 ' + padding
    const result = anonymize(input)
    expect(result.processedText).not.toContain('123.456.789-09')
    expect(result.processedText).toContain('[CPF_REMOVIDO]')
    expect(result.piiCategories).toContain('cpf')
  })

  // [SUCCESS] scrapedTextId é opcional (não afeta resultado)
  it('aceita scrapedTextId opcional sem alterar comportamento', () => {
    const result = anonymize('Email: user@domain.com', 'test-id-123')
    expect(result.processedText).toContain('[EMAIL_REMOVIDO]')
    expect(result.piiCategories).toContain('email')
  })
})
