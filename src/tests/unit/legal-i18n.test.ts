/**
 * IB-I18N-01 — garante que privacy/cookies tem META para TODOS os locales de
 * routing.locales (Zero Orfaos de locale) e que o cabecalho de versao e localizado.
 */
import { describe, it, expect } from 'vitest'
import { routing } from '@/i18n/config'
import { formatLegalHeader } from '@/lib/legal/versions'
import { PRIVACY_META, COOKIES_META } from '@/lib/legal/page-meta'

const PAGES = [
  { name: 'privacy', META: PRIVACY_META },
  { name: 'cookies', META: COOKIES_META },
] as const

describe('legal pages i18n (IB-I18N-01)', () => {
  for (const { name, META } of PAGES) {
    it(`${name}: META cobre exatamente routing.locales`, () => {
      expect(Object.keys(META).sort()).toEqual([...routing.locales].sort())
    })

    it(`${name}: cada locale tem title e description nao vazios`, () => {
      for (const locale of routing.locales) {
        expect((META[locale]?.title ?? '').length).toBeGreaterThan(0)
        expect((META[locale]?.description ?? '').length).toBeGreaterThan(0)
      }
    })
  }

  it('formatLegalHeader e localizado por locale e nao usa travessao', () => {
    for (const locale of routing.locales) {
      const header = formatLegalHeader('privacy', locale)
      expect(header.length).toBeGreaterThan(0)
      expect(header).not.toContain('—')
    }
    expect(formatLegalHeader('privacy', 'en-US')).toContain('Version')
    expect(formatLegalHeader('privacy', 'it-IT')).toContain('Versione')
    expect(formatLegalHeader('privacy', 'es-ES')).toContain('actualizacion')
  })
})
