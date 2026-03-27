import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, formatDateRelative } from '../date'

describe('formatDate', () => {
  it('formata Date object em pt-BR', () => {
    const result = formatDate(new Date('2026-03-23T12:00:00Z'))
    expect(result).toMatch(/23\/03\/2026/)
  })

  it('aceita string ISO como entrada', () => {
    const fromDate = formatDate(new Date('2026-03-23T12:00:00Z'))
    const fromString = formatDate('2026-03-23T12:00:00Z')
    expect(fromDate).toBe(fromString)
  })

  it('aceita opções customizadas', () => {
    const result = formatDate(new Date('2026-03-23'), { month: 'long' })
    expect(result).toContain('março')
  })
})

describe('formatDateTime', () => {
  it('inclui hora e minuto', () => {
    const result = formatDateTime(new Date('2026-03-23T15:30:00Z'))
    // resultado varia por timezone, mas deve incluir ':' para hora
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })
})

describe('formatDateRelative', () => {
  it('retorna "agora" para datas muito recentes', () => {
    const date = new Date(Date.now() - 30000) // 30 segundos atrás
    expect(formatDateRelative(date)).toBe('agora')
  })

  it('retorna "há X min" para menos de 1 hora', () => {
    const date = new Date(Date.now() - 5 * 60000) // 5 minutos atrás
    expect(formatDateRelative(date)).toBe('há 5 min')
  })

  it('retorna "há Xh" para menos de 24 horas', () => {
    const date = new Date(Date.now() - 2 * 3600000) // 2 horas atrás
    expect(formatDateRelative(date)).toBe('há 2h')
  })

  it('retorna "há Xd" para menos de 7 dias', () => {
    const date = new Date(Date.now() - 3 * 86400000) // 3 dias atrás
    expect(formatDateRelative(date)).toBe('há 3d')
  })
})
