/**
 * SA-SEC-02 — testes do util SSRF-safe (app). 100% mock: vi.mock de
 * node:dns/promises e global fetch (nao toca rede). Cobre isBlockedIp
 * (IPv4/IPv6/IPv4-mapped), assertHostAllowed (throw em IP privado / resolve
 * privado, ok em publico) e safeFetch (bloqueio de redirect p/ Location interno
 * + limite de maxRedirects).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockLookup } = vi.hoisted(() => ({ mockLookup: vi.fn() }))
vi.mock('node:dns/promises', () => ({ lookup: mockLookup }))
// undici Agent nao e exercitado (global fetch e mockado), mas precisa existir.
vi.mock('undici', () => ({ Agent: class {} }))

import { isBlockedIp, assertHostAllowed, safeFetch, SsrfBlockedError } from '../safe-fetch'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('isBlockedIp', () => {
  it('bloqueia ranges privados/link-local/metadata/loopback', () => {
    for (const ip of ['127.0.0.1', '169.254.169.254', '10.1.2.3', '192.168.0.1', '172.16.5.5', '100.64.0.1', '0.0.0.0']) {
      expect(isBlockedIp(ip), ip).toBe(true)
    }
  })
  it('bloqueia IPv6 interno e IPv4-mapped', () => {
    for (const ip of ['::1', '::', 'fc00::1', 'fd12::3', 'fe80::1', '::ffff:127.0.0.1', '::ffff:169.254.169.254']) {
      expect(isBlockedIp(ip), ip).toBe(true)
    }
  })
  it('permite IP publico', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111']) {
      expect(isBlockedIp(ip), ip).toBe(false)
    }
  })
})

describe('assertHostAllowed', () => {
  it('rejeita protocolo nao-http', async () => {
    await expect(assertHostAllowed('file:///etc/passwd')).rejects.toBeInstanceOf(SsrfBlockedError)
  })
  it('rejeita IP literal interno sem resolver DNS', async () => {
    await expect(assertHostAllowed('http://169.254.169.254/latest/meta-data')).rejects.toBeInstanceOf(SsrfBlockedError)
    expect(mockLookup).not.toHaveBeenCalled()
  })
  it('rejeita host que resolve para IP privado', async () => {
    mockLookup.mockResolvedValue([{ address: '10.0.0.5', family: 4 }])
    await expect(assertHostAllowed('http://rebind.evil.test/')).rejects.toBeInstanceOf(SsrfBlockedError)
  })
  it('rejeita se QUALQUER endereco resolvido for interno', async () => {
    mockLookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ])
    await expect(assertHostAllowed('http://mixed.test/')).rejects.toBeInstanceOf(SsrfBlockedError)
  })
  it('aceita host publico e pina o primeiro IP', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
    const r = await assertHostAllowed('https://example.test/path')
    expect(r.ip).toBe('93.184.216.34')
    expect(r.family).toBe(4)
    expect(r.url.toString()).toContain('example.test')
  })
})

describe('safeFetch', () => {
  it('rejeita redirect cujo Location aponta para IP interno', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
    const res = {
      status: 302,
      headers: { get: (h: string) => (h.toLowerCase() === 'location' ? 'http://169.254.169.254/' : null) },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res))
    await expect(safeFetch('https://example.test/')).rejects.toBeInstanceOf(SsrfBlockedError)
    vi.unstubAllGlobals()
  })

  it('retorna a resposta final quando publico (sem redirect)', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
    const res = { status: 200, headers: { get: () => null } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res))
    const out = await safeFetch('https://example.test/')
    expect(out.status).toBe(200)
    vi.unstubAllGlobals()
  })

  it('lanca apos exceder maxRedirects', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
    const res = {
      status: 302,
      headers: { get: (h: string) => (h.toLowerCase() === 'location' ? 'https://example.test/next' : null) },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res))
    await expect(safeFetch('https://example.test/', { maxRedirects: 2 })).rejects.toBeInstanceOf(SsrfBlockedError)
    vi.unstubAllGlobals()
  })
})
