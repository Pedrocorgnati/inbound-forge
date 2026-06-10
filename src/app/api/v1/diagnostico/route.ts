import { createHash, randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { encryptPayload } from '@/lib/pii/encrypt'
import {
  checkDiagnosticoPublicRateLimit,
  extractClientIp,
} from '@/lib/rate-limit/diagnostico-public'
import { withIdempotency } from '@/lib/idempotency/middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const POW_PREFIX = '000'
const RAW_TEXT_TTL_MS = 60 * 60 * 1000

const DiagnosticoSchema = z.object({
  name: z.string().trim().min(2, 'Nome obrigatorio').max(120),
  company: z.string().trim().min(2, 'Empresa obrigatoria').max(160),
  email: z.string().trim().email('Email invalido').max(254),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s().-]{10,20}$/, 'Telefone invalido'),
  pain: z.string().trim().min(20, 'Descreva a dor com pelo menos 20 caracteres').max(1200),
  segment: z.string().trim().min(2, 'Segmento obrigatorio').max(120),
  lgpdConsent: z.literal(true),
  retentionAccepted: z.literal(true),
  pow: z.object({
    nonce: z.string().regex(/^[a-f0-9]{32}$/),
    answer: z.number().int().min(0).max(20_000_000),
  }),
  website: z.string().max(0).optional().or(z.literal('')),
})

function verifyProofOfWork(nonce: string, answer: number): boolean {
  const digest = createHash('sha256')
    .update(`diagnostico:${nonce}:${answer}`)
    .digest('hex')
  return digest.startsWith(POW_PREFIX)
}

function jsonError(code: string, message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ success: false, code, message }, { status, headers })
}

export async function POST(request: NextRequest) {
  // Rota publica anonima: escopo 'public'. A chave Idempotency-Key (UUID v7)
  // gerada pelo cliente garante unicidade — sem risco de colisao cruzada.
  return withIdempotency(request, {
    userId: 'public',
    handler: async () => {
      const correlationId = randomUUID()
      const ip = extractClientIp(request.headers)
      const rateLimit = await checkDiagnosticoPublicRateLimit(ip)

      if (!rateLimit.allowed) {
        return jsonError(
          'RATE_LIMITED',
          'Muitas tentativas. Tente novamente em instantes.',
          429,
          {
            'Retry-After': String(rateLimit.retryAfterSeconds),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          },
        )
      }

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return jsonError('INVALID_JSON', 'Body invalido.', 422)
      }

      const parsed = DiagnosticoSchema.safeParse(body)
      if (!parsed.success) {
        return jsonError('VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Dados invalidos.', 422)
      }

      if (!verifyProofOfWork(parsed.data.pow.nonce, parsed.data.pow.answer)) {
        return jsonError('BOT_CHECK_FAILED', 'Validacao anti-spam falhou. Recarregue e tente novamente.', 400)
      }

      const submittedAt = new Date()
      const rawTextExpiresAt = new Date(submittedAt.getTime() + RAW_TEXT_TTL_MS)
      const piiPayload = {
        name: parsed.data.name,
        company: parsed.data.company,
        email: parsed.data.email,
        phone: parsed.data.phone,
        pain: parsed.data.pain,
        segment: parsed.data.segment,
        lgpdConsentAt: submittedAt.toISOString(),
      }
      const encryptedPayload = encryptPayload(piiPayload)
      const rawText = encryptPayload({
        summary: `${parsed.data.company} (${parsed.data.segment}): ${parsed.data.pain}`,
        submittedAt: submittedAt.toISOString(),
      })

      try {
        await prisma.diagnosticoLead.create({
          data: {
            correlationId,
            encryptedPayload,
            rawText,
            rawTextExpiresAt,
            segment: parsed.data.segment,
            lgpdConsent: true,
            lgpdConsentAt: submittedAt,
            sourceIpHash: createHash('sha256').update(ip).digest('hex'),
            userAgent: request.headers.get('user-agent')?.slice(0, 500) ?? null,
          },
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown'
        console.error(`[diagnostico] create failed correlation_id=${correlationId}: ${message}`)
        return jsonError('INTERNAL_ERROR', 'Nao foi possivel registrar o diagnostico agora.', 500)
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            correlation_id: correlationId,
            raw_text_retention_seconds: RAW_TEXT_TTL_MS / 1000,
          },
        },
        {
          status: 201,
          headers: {
            'X-Correlation-Id': correlationId,
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          },
        },
      )
    },
  })
}

