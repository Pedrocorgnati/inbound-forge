// Inbound F2 — submit publico de lead form. Espelha o padrao publico (idempotency +
// rate-limit + honeypot). Cria subscriber + (best-effort) Lead + submissao.
import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { checkDiagnosticoPublicRateLimit, extractClientIp } from '@/lib/rate-limit/diagnostico-public'
import { withIdempotency } from '@/lib/idempotency/middleware'
import { createLeadFromCapture } from '@/lib/leads/create-from-capture'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SubmitSchema = z.object({
  email: z.string().trim().email('Email invalido').max(254),
  name: z.string().trim().max(160).optional(),
  company: z.string().trim().max(160).optional(),
  lgpdConsent: z.literal(true),
  utm: z
    .object({
      source: z.string().max(120).optional(),
      medium: z.string().max(120).optional(),
      campaign: z.string().max(120).optional(),
    })
    .optional(),
  website: z.string().max(0).optional().or(z.literal('')), // honeypot
})

function jsonError(code: string, message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ success: false, code, message }, { status, headers })
}

type Params = { params: Promise<{ slug: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  return withIdempotency(request, {
    userId: 'public',
    handler: async () => {
      const { slug } = await params
      const ip = extractClientIp(request.headers)
      const rateLimit = await checkDiagnosticoPublicRateLimit(ip)
      if (!rateLimit.allowed) {
        return jsonError('RATE_LIMITED', 'Muitas tentativas. Tente novamente em instantes.', 429, {
          'Retry-After': String(rateLimit.retryAfterSeconds),
        })
      }

      const form = await prisma.leadForm.findUnique({ where: { slug } })
      if (!form || form.status !== 'PUBLISHED') {
        return jsonError('FORM_NOT_FOUND', 'Formulario indisponivel.', 404)
      }

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return jsonError('INVALID_JSON', 'Body invalido.', 422)
      }
      const parsed = SubmitSchema.safeParse(body)
      if (!parsed.success) {
        return jsonError('VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Dados invalidos.', 422)
      }
      if (parsed.data.website) {
        return NextResponse.json({ success: true }) // honeypot: bot
      }

      try {
        await createLeadFromCapture({
          formId: form.id,
          email: parsed.data.email,
          name: parsed.data.name ?? null,
          company: parsed.data.company ?? null,
          channel: form.defaultChannel ?? null,
          lgpdConsent: true,
          source: `form:${form.slug}`,
          utm: parsed.data.utm,
          sourceIpHash: createHash('sha256').update(ip).digest('hex'),
          userAgent: request.headers.get('user-agent')?.slice(0, 500) ?? null,
        })
      } catch {
        return jsonError('INTERNAL', 'Nao foi possivel processar o envio.', 500)
      }

      return NextResponse.json({
        success: true,
        message: form.successMessage ?? 'Recebido! Verifique seu email.',
      })
    },
  })
}
