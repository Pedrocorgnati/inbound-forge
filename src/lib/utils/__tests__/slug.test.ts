import { describe, it, expect } from 'vitest'
import { generateSlug } from '../slug'

describe('generateSlug', () => {
  it('converte texto simples para slug', () => {
    expect(generateSlug('Hello World')).toBe('hello-world')
  })

  it('remove acentos', () => {
    expect(generateSlug('Olá Mundo!')).toBe('ola-mundo')
  })

  it('remove caracteres especiais', () => {
    expect(generateSlug('Título #1: Test!')).toBe('titulo-1-test')
  })

  it('colapsa múltiplos espaços/hífens', () => {
    expect(generateSlug('Hello   World')).toBe('hello-world')
    expect(generateSlug('hello--world')).toBe('hello-world')
  })

  it('retorna string vazia para input vazio', () => {
    expect(generateSlug('')).toBe('')
  })

  it('lida com caracteres cedilha', () => {
    expect(generateSlug('ação')).toBe('acao')
  })
})
