import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendMarketingEmail } from '../marketing-send'

const ORIG_KEY = process.env.RESEND_API_KEY

beforeEach(() => {
  vi.restoreAllMocks()
})
afterEach(() => {
  if (ORIG_KEY === undefined) delete process.env.RESEND_API_KEY
  else process.env.RESEND_API_KEY = ORIG_KEY
})

describe('sendMarketingEmail — LGPD fail-closed', () => {
  it('RECUSA enviar se o html nao contiver o link de unsubscribe', async () => {
    process.env.RESEND_API_KEY = 'test'
    const fetchSpy = vi.spyOn(global, 'fetch')
    const res = await sendMarketingEmail({
      to: 'x@y.com',
      subject: 's',
      html: '<p>sem link</p>',
      unsubscribeUrl: 'https://app/api/unsubscribe?token=abc',
    })
    expect(res.ok).toBe(false)
    expect(res.skipped).toBe(true)
    expect(res.error).toBe('unsubscribe_link_missing')
    expect(fetchSpy).not.toHaveBeenCalled() // nunca chega a enviar
  })

  it('sem RESEND_API_KEY: skip (nao quebra), com link presente', async () => {
    delete process.env.RESEND_API_KEY
    const url = 'https://app/api/unsubscribe?token=abc'
    const res = await sendMarketingEmail({ to: 'x@y.com', subject: 's', html: `<a href="${url}">unsub</a>`, unsubscribeUrl: url })
    expect(res.ok).toBe(false)
    expect(res.skipped).toBe(true)
    expect(res.error).toBe('resend_not_configured')
  })

  it('com link + chave: chama Resend e seta headers List-Unsubscribe', async () => {
    process.env.RESEND_API_KEY = 'test'
    const url = 'https://app/api/unsubscribe?token=abc'
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'msg-1' }), { status: 200 }),
    )
    const res = await sendMarketingEmail({ to: 'x@y.com', subject: 's', html: `<a href="${url}">unsub</a>`, unsubscribeUrl: url })
    expect(res.ok).toBe(true)
    expect(res.messageId).toBe('msg-1')
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.headers['List-Unsubscribe']).toBe(`<${url}>`)
    expect(body.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })
})
