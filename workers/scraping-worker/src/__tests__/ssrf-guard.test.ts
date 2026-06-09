/**
 * SA-SEC-02 — testes do guard SSRF do scraping-worker. 100% mock de
 * node:dns/promises (nao toca rede). Espelha a cobertura do util do app.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockLookup } = vi.hoisted(() => ({ mockLookup: vi.fn() }))
vi.mock('node:dns/promises', () => ({ lookup: mockLookup }))

import { isBlockedIp, assertUrlSafe, SsrfBlockedError } from '../ssrf-guard'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('isBlockedIp', () => {
  it('bloqueia ranges privados/link-local/metadata/loopback + IPv6 interno', () => {
    for (const ip of [
      '127.0.0.1', '169.254.169.254', '10.1.2.3', '192.168.0.1', '172.16.5.5',
      '100.64.0.1', '0.0.0.0', '::1', '::', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1',
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true)
    }
  })
  it('permite IP publico', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34']) {
      expect(isBlockedIp(ip), ip).toBe(false)
    }
  })
})

describe('assertUrlSafe', () => {
  it('rejeita protocolo nao-http', async () => {
    await expect(assertUrlSafe('ftp://example.test/')).rejects.toBeInstanceOf(SsrfBlockedError)
  })
  it('rejeita IP literal interno sem resolver DNS', async () => {
    await expect(assertUrlSafe('http://169.254.169.254/latest')).rejects.toBeInstanceOf(SsrfBlockedError)
    expect(mockLookup).not.toHaveBeenCalled()
  })
  it('rejeita host que resolve para IP privado (anti-rebinding)', async () => {
    mockLookup.mockResolvedValue([{ address: '10.0.0.5', family: 4 }])
    await expect(assertUrlSafe('http://rebind.evil.test/')).rejects.toBeInstanceOf(SsrfBlockedError)
  })
  it('aceita host publico e retorna o IP pinado', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
    await expect(assertUrlSafe('https://example.test/x')).resolves.toBe('93.184.216.34')
  })
})
