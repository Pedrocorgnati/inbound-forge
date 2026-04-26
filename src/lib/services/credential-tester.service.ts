// credential-tester — healthcheck por provider + persistencia de resultado em SystemSetting
// TASK-8 ST002 / CL-248

import 'server-only'
import { prisma } from '@/lib/prisma'
import { getApiKey, type ApiProvider } from '@/lib/secrets/key-manager'
import { auditLog } from '@/lib/audit'

const SETTING_PREFIX = 'apiKey.'

export interface CredentialProbeResult {
  ok: boolean
  status?: number
  message: string
  expiresAt?: string | null
  probeDetails?: Record<string, unknown>
}

type ExtendedProvider = ApiProvider | 'instagram' | 'ga4'

async function testInstagram(apiKey: string): Promise<CredentialProbeResult> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,username&access_token=${encodeURIComponent(apiKey)}`,
      { cache: 'no-store' },
    )
    const data = (await res.json().catch(() => ({}))) as {
      id?: string
      error?: { code?: number; message?: string }
    }
    if (!res.ok || data.error) {
      const expired = data.error?.code === 190
      return {
        ok: false,
        status: res.status,
        message: expired ? 'Token expirado (Graph 190).' : (data.error?.message ?? `HTTP ${res.status}`),
        expiresAt: null,
      }
    }
    return { ok: true, status: res.status, message: 'Token Instagram valido.', probeDetails: { id: data.id } }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'network', expiresAt: null }
  }
}

async function testOpenAI(apiKey: string): Promise<CredentialProbeResult> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    })
    if (!res.ok) {
      return { ok: false, status: res.status, message: `HTTP ${res.status}` }
    }
    return { ok: true, status: res.status, message: 'OpenAI key valida.' }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'network' }
  }
}

async function testAnthropic(apiKey: string): Promise<CredentialProbeResult> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      cache: 'no-store',
    })
    if (!res.ok) return { ok: false, status: res.status, message: `HTTP ${res.status}` }
    return { ok: true, status: res.status, message: 'Anthropic key valida.' }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'network' }
  }
}

async function testGa4(apiKey: string): Promise<CredentialProbeResult> {
  try {
    const res = await fetch(
      'https://analyticsadmin.googleapis.com/v1beta/properties?pageSize=1',
      { headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store' },
    )
    if (res.status === 401 || res.status === 403) {
      return { ok: false, status: res.status, message: 'GA4: token sem acesso ou expirado.' }
    }
    if (!res.ok) return { ok: false, status: res.status, message: `HTTP ${res.status}` }
    return { ok: true, status: res.status, message: 'GA4 token valido.' }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'network' }
  }
}

async function testGenericFormat(apiKey: string): Promise<CredentialProbeResult> {
  if (apiKey.length < 10) return { ok: false, message: 'Chave muito curta.' }
  return { ok: true, message: 'Formato valido (sem ping remoto).' }
}

export async function testCredential(
  provider: ExtendedProvider,
  apiKey?: string,
): Promise<CredentialProbeResult> {
  let key = apiKey
  if (!key) {
    if (provider === 'instagram' || provider === 'ga4') {
      // Instagram/GA4 tokens armazenados em SystemSetting com chave igual ao provider
      try {
        const row = await prisma.systemSetting.findUnique({
          where: { key: SETTING_PREFIX + provider },
        })
        if (row && typeof row.value === 'object' && row.value && 'ciphertext' in row.value) {
          const { decryptPII } = await import('@/lib/crypto')
          const ct = (row.value as { ciphertext?: string }).ciphertext
          if (typeof ct === 'string') key = decryptPII(ct)
        }
      } catch {
        key = undefined
      }
    } else {
      key = (await getApiKey(provider as ApiProvider)) ?? undefined
    }
  }
  if (!key) return { ok: false, message: 'Credencial nao configurada.' }

  switch (provider) {
    case 'instagram':
      return testInstagram(key)
    case 'openai':
      return testOpenAI(key)
    case 'anthropic':
      return testAnthropic(key)
    case 'ga4':
      return testGa4(key)
    default:
      return testGenericFormat(key)
  }
}

export async function recordTestResult(
  provider: ExtendedProvider,
  result: CredentialProbeResult,
  userId?: string,
): Promise<void> {
  const key = SETTING_PREFIX + provider
  const row = await prisma.systemSetting.findUnique({ where: { key } })
  const current = (row?.value as Record<string, unknown> | null) ?? {}
  const next = {
    ...current,
    lastTestedAt: new Date().toISOString(),
    lastTestStatus: result.ok ? 'OK' : 'FAILED',
    lastTestMessage: result.message.slice(0, 500),
    ...(result.expiresAt !== undefined ? { tokenExpiresAt: result.expiresAt } : {}),
  }

  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value: next as never, updatedBy: userId },
    update: { value: next as never, updatedBy: userId },
  })

  void auditLog({
    action: 'CREDENTIAL_TEST',
    entityType: 'ApiKey',
    entityId: provider,
    userId: userId ?? 'system',
    metadata: { ok: result.ok, status: result.status },
  })
}
