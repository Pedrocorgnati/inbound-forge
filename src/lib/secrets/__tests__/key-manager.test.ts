/**
 * SA-SEC-07 — key-manager: cifra fail-loud (sem fallback base64 reversivel) com
 * compat de leitura de valores legados. Teste mockado (sem DB real).
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'

// Chave AES-256 valida (32 bytes em base64) — .env.test pode ter uma invalida.
const VALID_KEY = Buffer.from('0'.repeat(32)).toString('base64')

const { mockFindUnique, mockUpsert } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpsert: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { systemSetting: { findUnique: mockFindUnique, upsert: mockUpsert } },
}))

import { encryptPII, decryptPII } from '@/lib/crypto'
import { getApiKey, setApiKey, invalidateKeyCache } from '@/lib/secrets/key-manager'
import { logger } from '@/lib/logger'

describe('key-manager (SA-SEC-07)', () => {
  beforeAll(() => {
    process.env.PII_ENCRYPTION_KEY = VALID_KEY
  })

  beforeEach(() => {
    invalidateKeyCache()
    vi.clearAllMocks()
    process.env.PII_ENCRYPTION_KEY = VALID_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.FLUX_API_KEY
    mockUpsert.mockResolvedValue({})
  })

  it('setApiKey cifra de verdade (ciphertext != plaintext, decifravel)', async () => {
    await setApiKey('openai', 'sk-test-123456')

    const arg = mockUpsert.mock.calls[0][0]
    const ciphertext = (arg.create.value as { ciphertext: string }).ciphertext
    expect(ciphertext).not.toContain('sk-test')
    expect(decryptPII(ciphertext)).toBe('sk-test-123456')
  })

  it('FAIL-LOUD: setApiKey lanca quando PII_ENCRYPTION_KEY ausente (nunca grava texto plano)', async () => {
    delete process.env.PII_ENCRYPTION_KEY
    await expect(setApiKey('openai', 'sk-should-not-persist')).rejects.toThrow()
    // upsert nunca chamado: nada gravado em texto plano.
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('getApiKey decifra ciphertext GCM real', async () => {
    mockFindUnique.mockResolvedValue({ value: { ciphertext: encryptPII('sk-real-999999') } })
    expect(await getApiKey('openai')).toBe('sk-real-999999')
  })

  it('compat: le valor legado base64 (nao cifrado) e avisa para rotacionar', async () => {
    const legacy = Buffer.from('sk-legacy-777777', 'utf8').toString('base64')
    mockFindUnique.mockResolvedValue({ value: { ciphertext: legacy } })
    const warn = vi.spyOn(logger, 'warn')

    expect(await getApiKey('flux')).toBe('sk-legacy-777777')
    expect(warn).toHaveBeenCalled()
  })

  it('NO-GARBAGE: ciphertext com chave errada falha alto e cai no env fallback', async () => {
    // Cifra com VALID_KEY, depois troca a chave -> decrypt GCM falha.
    const ciphertext = encryptPII('should-not-leak')
    process.env.PII_ENCRYPTION_KEY = Buffer.from('1'.repeat(32)).toString('base64')
    process.env.OPENAI_API_KEY = 'env-fallback'
    mockFindUnique.mockResolvedValue({ value: { ciphertext } })
    const errSpy = vi.spyOn(logger, 'error')

    expect(await getApiKey('openai')).toBe('env-fallback')
    expect(errSpy).toHaveBeenCalled()
  })
})
