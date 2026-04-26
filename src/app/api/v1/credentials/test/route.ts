import { NextRequest, NextResponse } from 'next/server'
import { requireSession, validationError } from '@/lib/api-auth'
import { CredentialTestBodySchema } from '@/schemas/health.schema'
import { testIdeogramConnection } from '@/lib/ai/ideogram'

export const runtime = 'nodejs'

type ServiceKey = 'anthropic' | 'ideogram' | 'instagram' | 'supabase_url' | 'supabase_anon'

// POST /api/v1/credentials/test — testa conectividade de credencial
// SEC-008: NUNCA logar a key em nenhum logger/console/Sentry
// SEC-012: chave nunca retornada ou armazenada — apenas testada e descartada
export async function POST(req: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  // RESOLVED: G007 — safeParse para retornar 422 em vez de 500 para input inválido
  let body: unknown
  try { body = await req.json() } catch { return validationError(new Error('Body inválido')) }

  const parsedBody = CredentialTestBodySchema.safeParse(body)
  if (!parsedBody.success) return validationError(parsedBody.error)

  const { service, key } = parsedBody.data

  // SEC-008: NUNCA incluir a key em qualquer log
  const start = Date.now()

  try {
    let ok = false

    switch (service as ServiceKey) {
      case 'anthropic': {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'ping' }],
          }),
          signal: AbortSignal.timeout(30_000),
        })
        // 200/400 = chave válida; 401 = inválida
        ok = res.status !== 401
        break
      }

      case 'ideogram': {
        // A-007: timeout explícito via testIdeogramConnection (60s)
        ok = await testIdeogramConnection(key)
        break
      }

      case 'instagram': {
        const res = await fetch(
          `https://graph.instagram.com/me?access_token=${encodeURIComponent(key)}`,
          { signal: AbortSignal.timeout(15_000) }
        )
        ok = res.status === 200
        break
      }

      case 'supabase_url': {
        ok = key.includes('.supabase.co') && key.startsWith('https://')
        break
      }

      case 'supabase_anon': {
        const parts = key.split('.')
        ok = parts.length === 3 && parts.every((p) => p.length > 0)
        break
      }
    }

    const latency = Date.now() - start
    return NextResponse.json({ ok, latency })
  } catch {
    // SEC-008: Nunca incluir a key na mensagem de erro
    return NextResponse.json(
      { ok: false, latency: Date.now() - start, error: 'Erro ao testar conexão' },
      { status: 200 } // 200 para não expor detalhes via HTTP status
    )
  }
}
