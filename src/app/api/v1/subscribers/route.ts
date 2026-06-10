// Inbound F1 — inscricao publica de email (double-opt-in). Espelha o padrao publico
// de /api/v1/diagnostico (idempotency + rate-limit + honeypot). Anti-enumeracao:
// resposta generica independente de o email ja existir.
import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkDiagnosticoPublicRateLimit, extractClientIp } from '@/lib/rate-limit/diagnostico-public'
import { withIdempotency } from '@/lib/idempotency/middleware'
import { subscribe } from '@/lib/email/subscriber'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SubscribeSchema = z.object({
  email: z.string().trim().email('Email invalido').max(254),
  lgpdConsent: z.literal(true),
  source: z.string().trim().max(120).optional(),
  website: z.string().max(0).optional().or(z.literal('')), // honeypot
})

function jsonError(code: string, message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ success: false, code, message }, { status, headers })
}

export async function POST(request: NextRequest) {
  return withIdempotency(request, {
    userId: 'public',
    handler: async () => {
      const ip = extractClientIp(request.headers)
      const rateLimit = await checkDiagnosticoPublicRateLimit(ip)
      if (!rateLimit.allowed) {
        return jsonError('RATE_LIMITED', 'Muitas tentativas. Tente novamente em instantes.', 429, {
          'Retry-After': String(rateLimit.retryAfterSeconds),
        })
      }

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return jsonError('INVALID_JSON', 'Body invalido.', 422)
      }

      const parsed = SubscribeSchema.safeParse(body)
      if (!parsed.success) {
        return jsonError('VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Dados invalidos.', 422)
      }
      // Honeypot preenchido => bot. Resposta de sucesso silenciosa (nao revela).
      if (parsed.data.website) {
        return NextResponse.json({ success: true })
      }

      try {
        await subscribe({
          email: parsed.data.email,
          lgpdConsent: true,
          source: parsed.data.source ?? 'public',
          sourceIpHash: createHash('sha256').update(ip).digest('hex'),
          userAgent: request.headers.get('user-agent')?.slice(0, 500) ?? null,
        })
      } catch {
        // Nunca vaza detalhe; loga server-side sem PII e segue.
        return jsonError('INTERNAL', 'Nao foi possivel processar a inscricao.', 500)
      }

      // Anti-enumeracao: sempre a mesma resposta.
      return NextResponse.json({
        success: true,
        message: 'Verifique seu email para confirmar a inscricao.',
      })
    },
  })
}
