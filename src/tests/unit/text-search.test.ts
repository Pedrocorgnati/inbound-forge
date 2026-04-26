/**
 * TASK-11 ST002 — testes de sanitize/buildSearchWhere.
 */
import { describe, it, expect } from 'vitest'
import { buildSearchWhere, sanitizeSearchTerm } from '@/lib/search/text-search'

describe('sanitizeSearchTerm', () => {
  it('retorna null para strings curtas', () => {
    expect(sanitizeSearchTerm('')).toBeNull()
    expect(sanitizeSearchTerm(' a ')).toBeNull()
  })
  it('escapa wildcards %, _', () => {
    expect(sanitizeSearchTerm('50% off_now')).toBe('50\\% off\\_now')
  })
  it('trunca em 100 caracteres', () => {
    const long = 'x'.repeat(200)
    expect(sanitizeSearchTerm(long)).toHaveLength(100)
  })
})

describe('buildSearchWhere', () => {
  it('retorna undefined se search vazio ou < 2 chars', () => {
    expect(buildSearchWhere('', ['name'])).toBeUndefined()
    expect(buildSearchWhere('a', ['name'])).toBeUndefined()
  })
  it('monta OR por campo', () => {
    const result = buildSearchWhere('abc', ['name', 'company'])
    expect(result).toEqual({
      OR: [
        { name: { contains: 'abc', mode: 'insensitive' } },
        { company: { contains: 'abc', mode: 'insensitive' } },
      ],
    })
  })
})
