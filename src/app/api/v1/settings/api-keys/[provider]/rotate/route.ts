// TASK-19 ST001 (CL-290): POST rotaciona API key do provider com validacao
// upfront na API do provider. Se invalida, retorna 400 sem persistir.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  setApiKey,
  testProviderConnection,
  type ApiProvider,
} from '@/lib/secrets/key-manager'
import {
  requireSession,
  ok,
  validationError,
  badRequest,
  internalError,
} from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

const ALLOWED: ApiProvider[] = ['openai', 'ideogram', 'flux', 'browserless', 'anthropic']

const RotateSchema = z.object({
  newKey: z.string().min(10).max(500),
})

type Params = { params: Promise<{ provider: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { provider } = await params
  if (!ALLOWED.includes(provider as ApiProvider)) {
    return badRequest(`Provider não suportado: ${provider}`)
  }
  const typed = provider as ApiProvider

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }
  const parsed = RotateSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const test = await testProviderConnection(typed, parsed.data.newKey)
  if (!test.ok) {
    return badRequest(
      `Nova chave falhou na validação (${test.status ?? 'erro'}): ${test.error ?? 'rejeitada pelo provider'}`,
    )
  }

  try {
    await setApiKey(typed, parsed.data.newKey, user?.id)
    if (user?.id) {
      await auditLog({
        action: 'api_key_rotated',
        entityType: 'SystemSetting',
        entityId: `apiKey.${typed}`,
        userId: user.id,
        metadata: { provider: typed, status: test.status ?? 200 },
      }).catch(() => undefined)
    }
    return ok({ provider: typed, rotatedAt: new Date().toISOString(), status: 'ok' })
  } catch {
    return internalError()
  }
}
