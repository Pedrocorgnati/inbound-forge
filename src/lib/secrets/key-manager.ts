// TASK-19 ST001 (CL-290): gerenciador de API keys persistidas em SystemSetting.
// Suporta leitura com fallback para env var e rotacao com auditoria.
// Encrypt at rest via AES-256-CBC (lib/crypto existente). Cache 30s por chave.

import 'server-only'
import { prisma } from '@/lib/prisma'
import { encryptPII, decryptPII } from '@/lib/crypto'
import { logger } from '@/lib/logger'

export type ApiProvider = 'openai' | 'ideogram' | 'flux' | 'browserless' | 'anthropic'

const PROVIDER_ENV_MAP: Record<ApiProvider, string> = {
  openai: 'OPENAI_API_KEY',
  ideogram: 'IDEOGRAM_API_KEY',
  flux: 'FLUX_API_KEY',
  browserless: 'BROWSERLESS_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
}

const SETTING_PREFIX = 'apiKey.'
const CACHE_TTL_MS = 30_000

type CacheEntry = { value: string | null; expiresAt: number }
const cache = new Map<ApiProvider, CacheEntry>()

export function invalidateKeyCache(provider?: ApiProvider) {
  if (provider) cache.delete(provider)
  else cache.clear()
}

// SA-SEC-07: falhar alto. NUNCA persistir API key em base64 reversivel.
// Se PII_ENCRYPTION_KEY estiver ausente/invalida, encryptPII lanca e o erro
// propaga ate o caller (rotate route -> internalError), sem gravar texto plano.
function encrypt(raw: string): string {
  return encryptPII(raw)
}

// Compat de leitura: valores legados gravados pelo fallback antigo
// (Buffer.from(raw,'utf8').toString('base64')) quando a chave estava ausente.
// So aceita base64 canonico que decodifica para ASCII imprimivel (API keys sao
// ASCII); ciphertext GCM corrompido decodifica para binario -> rejeitado.
function tryLegacyBase64Plaintext(stored: string): string | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(stored)) return null
  const decoded = Buffer.from(stored, 'base64')
  if (decoded.toString('base64') !== stored) return null // nao canonico
  const text = decoded.toString('utf8')
  if (!/^[\x20-\x7E]+$/.test(text)) return null
  return text
}

function decrypt(stored: string): string {
  try {
    return decryptPII(stored)
  } catch (err) {
    const legacy = tryLegacyBase64Plaintext(stored)
    if (legacy !== null) {
      // Dado NAO-criptografado, marcado de forma explicita (nunca logar o valor).
      logger.warn('key-manager', 'Valor lido via fallback base64 legado (NAO criptografado). Rotacione a chave para re-cifrar.')
      return legacy
    }
    // Ciphertext real corrompido / chave errada: falhar alto em vez de retornar lixo.
    throw err
  }
}

export async function getApiKey(provider: ApiProvider): Promise<string | null> {
  const hit = cache.get(provider)
  if (hit && hit.expiresAt > Date.now()) return hit.value

  let value: string | null = null
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: SETTING_PREFIX + provider } })
    if (row && typeof row.value === 'object' && row.value && 'ciphertext' in row.value) {
      const ct = (row.value as { ciphertext?: string }).ciphertext
      if (typeof ct === 'string' && ct.length > 0) value = decrypt(ct)
    }
  } catch {
    // SA-SEC-07 (Zero Silencio): nao engolir erro de DB/decrypt silenciosamente.
    // decrypt() agora lanca em ciphertext corrompido -> degrada para env fallback,
    // nunca retorna string corrompida. Nunca logar ciphertext/plaintext.
    logger.error('key-manager', 'Falha ao ler/decifrar apiKey persistida; usando env fallback', { provider })
    value = null
  }
  if (!value) {
    const envName = PROVIDER_ENV_MAP[provider]
    value = process.env[envName] ?? null
  }

  cache.set(provider, { value, expiresAt: Date.now() + CACHE_TTL_MS })
  return value
}

export async function setApiKey(
  provider: ApiProvider,
  newKey: string,
  updatedBy?: string,
): Promise<void> {
  const key = SETTING_PREFIX + provider
  const ciphertext = encrypt(newKey)
  const value: Record<string, unknown> = {
    ciphertext,
    rotatedAt: new Date().toISOString(),
  }
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value: value as never, updatedBy },
    update: { value: value as never, updatedBy },
  })
  invalidateKeyCache(provider)
}

export async function testProviderConnection(
  provider: ApiProvider,
  apiKey: string,
): Promise<{ ok: boolean; error?: string; status?: number }> {
  try {
    if (provider === 'openai' || provider === 'anthropic') {
      const url =
        provider === 'openai'
          ? 'https://api.openai.com/v1/models'
          : 'https://api.anthropic.com/v1/models'
      const headers: Record<string, string> =
        provider === 'openai'
          ? { Authorization: `Bearer ${apiKey}` }
          : { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
      const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' })
      if (!res.ok) return { ok: false, status: res.status, error: `HTTP ${res.status}` }
      return { ok: true, status: res.status }
    }
    // Outros providers: validacao formal de formato.
    if (apiKey.length < 10) return { ok: false, error: 'Chave muito curta' }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network' }
  }
}

export { PROVIDER_ENV_MAP }
