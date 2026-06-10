import { describe, it, expect } from 'vitest'
import { injectUnsubscribe } from '../broadcast-sender'

const URL = 'https://app/api/unsubscribe?token=abc'

describe('injectUnsubscribe — garante link de descadastro (LGPD)', () => {
  it('append do footer sempre inclui a URL de unsubscribe', () => {
    const out = injectUnsubscribe('<p>conteudo</p>', URL)
    expect(out).toContain(URL)
    expect(out).toContain('<p>conteudo</p>')
  })

  it('substitui o placeholder {{unsubscribe}} pela URL', () => {
    const out = injectUnsubscribe('<p>cancele <a href="{{unsubscribe}}">aqui</a></p>', URL)
    expect(out).toContain(`href="${URL}"`)
    expect(out).not.toContain('{{unsubscribe}}')
    // e ainda assim o footer garante a presenca da url ao menos 1x
    expect(out.split(URL).length).toBeGreaterThanOrEqual(2)
  })

  it('o resultado SEMPRE contem a url (compativel com o fail-closed do sender)', () => {
    for (const body of ['', '<div></div>', 'texto puro', '{{unsubscribe}}']) {
      expect(injectUnsubscribe(body, URL)).toContain(URL)
    }
  })
})
