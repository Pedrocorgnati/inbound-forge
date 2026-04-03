import { describe, it, expect } from 'vitest'
import { formatCurrency } from '../currency'

describe('formatCurrency', () => {
  it('formata BRL corretamente', () => {
    const result = formatCurrency(1500)
    expect(result).toContain('1.500')
    expect(result).toContain('R$')
  })

  it('formata USD com locale en-US', () => {
    const result = formatCurrency(1000, 'USD')
    expect(result).toContain('1,000')
    expect(result).toContain('$')
  })

  it('formata valores decimais', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('1.234')
    expect(result).toContain('56')
  })

  it('formata zero corretamente', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
  })
})
