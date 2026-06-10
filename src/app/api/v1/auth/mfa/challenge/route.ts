/**
 * loop 05-27 TAREFA-028 (P3): MFA/TOTP opt-in — elevacao de sessao no login.
 *
 * POST { code } -> desafia o fator TOTP verificado e, no sucesso, eleva a sessao
 * para AAL2 (o Supabase reescreve os cookies da sessao via @supabase/ssr).
 * Usado pela pagina /mfa-challenge para cumprir "login pos-enable exige TOTP".
 *
 * Diferente de /verify, este endpoint NAO regenera backup codes — apenas autentica
 * o segundo fator de uma sessao ja existente (AAL1 -> AAL2).
 */
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { redis, REDIS_TTL } from '@/lib/redis'

const ChallengeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, 'Codigo deve ter 6 digitos'),
})

const MAX_ATTEMPTS = 5

async function checkRate(userId: string): Promise<boolean> {
  const key = `ratelimit:mfa-challenge:${userId}`
  const attempts = await redis.incr(key)
  if (attempts === 1) await redis.expire(key, REDIS_TTL.rateLimitWindow)
  return attempts <= MAX_ATTEMPTS
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response
  const userId = user!.id

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body invalido'))
  }
  const parsed = ChallengeSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  if (!(await checkRate(userId))) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

  try {
    const supabase = await createClient()

    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
    if (listError) return internalError('Nao foi possivel ler os fatores')

    // `factors.totp` lista apenas fatores verificados.
    const verified = (factors.totp ?? [])[0]
    if (!verified) {
      return NextResponse.json({ error: 'MFA_NOT_ENABLED' }, { status: 409 })
    }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: verified.id,
    })
    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'CHALLENGE_FAILED' }, { status: 400 })
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: verified.id,
      challengeId: challenge.id,
      code: parsed.data.code,
    })
    if (verifyError) {
      return NextResponse.json({ error: 'INVALID_CODE' }, { status: 401 })
    }

    return ok({ elevated: true })
  } catch {
    return internalError()
  }
}
