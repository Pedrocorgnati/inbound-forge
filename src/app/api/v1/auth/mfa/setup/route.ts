/**
 * loop 05-27 TAREFA-028 (P3): MFA/TOTP opt-in — enrolamento.
 *
 * GET  -> status atual do MFA do operador (enabled + backup codes restantes).
 * POST -> enrola um novo fator TOTP no Supabase Auth e devolve QR code + secret
 *         + URI otpauth. NAO ativa o MFA ainda — a ativacao acontece em
 *         POST /api/v1/auth/mfa/verify (que exige um codigo TOTP valido).
 *
 * O segredo TOTP e gerido/criptografado pelo Supabase (auth.users); este projeto
 * nao tem modelo Prisma `User`, portanto nao ha persistencia local do segredo.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { redis, REDIS_TTL } from '@/lib/redis'
import { TOTP_FRIENDLY_NAME } from '@/lib/mfa'

const MAX_ATTEMPTS = 10

async function checkRate(userId: string): Promise<boolean> {
  const key = `ratelimit:mfa-setup:${userId}`
  const attempts = await redis.incr(key)
  if (attempts === 1) await redis.expire(key, REDIS_TTL.rateLimitWindow)
  return attempts <= MAX_ATTEMPTS
}

export async function GET() {
  const { user, response } = await requireSession()
  if (response) return response
  const userId = user!.id

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) return internalError('Nao foi possivel ler o status do MFA')

    // `data.totp` lista apenas fatores verificados.
    const verified = (data.totp ?? []).length > 0
    const backupCodesRemaining = verified
      ? await prisma.mfaBackupCode.count({ where: { userId, usedAt: null } })
      : 0

    return ok({ enabled: verified, backupCodesRemaining })
  } catch {
    return internalError()
  }
}

/**
 * DELETE -> cancela um enrolamento ABANDONADO, removendo fatores TOTP nao-verificados
 * (fix REPROVADO finding TASK-028: cancelar o enroll deixava um fator unverified orfao
 * no Supabase). NUNCA remove um fator verificado/ativo — desativar MFA ativo exige
 * POST /api/v1/auth/mfa/disable com um codigo TOTP/backup valido.
 */
export async function DELETE() {
  const { response } = await requireSession()
  if (response) return response

  try {
    const supabase = await createClient()
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
    if (listError) return internalError('Nao foi possivel ler os fatores')

    const unverified = (factors.all ?? []).filter(
      (f) => f.factor_type === 'totp' && f.status === 'unverified',
    )
    for (const f of unverified) {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: f.id })
      if (unenrollError) return internalError('Nao foi possivel cancelar o enrolamento')
    }

    return ok({ canceled: unverified.length })
  } catch {
    return internalError()
  }
}

export async function POST(_request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response
  const userId = user!.id

  if (!(await checkRate(userId))) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

  try {
    const supabase = await createClient()

    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
    if (listError) return internalError('Nao foi possivel ler os fatores existentes')

    // `factors.totp` contem apenas fatores verificados (tipagem do supabase-js);
    // se houver algum, o MFA ja esta ativo.
    if ((factors.totp ?? []).length > 0) {
      return NextResponse.json({ error: 'MFA_ALREADY_ENABLED' }, { status: 409 })
    }

    // Limpa fatores TOTP nao-verificados orfaos (setups abandonados) antes de
    // re-enrolar. Os nao-verificados aparecem apenas em `factors.all`.
    const staleTotp = (factors.all ?? []).filter(
      (f) => f.factor_type === 'totp' && f.status === 'unverified',
    )
    for (const stale of staleTotp) {
      await supabase.auth.mfa.unenroll({ factorId: stale.id })
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `${TOTP_FRIENDLY_NAME}-${Date.now()}`,
    })
    if (error || !data) {
      return internalError('Nao foi possivel iniciar o enrolamento do MFA')
    }

    return ok({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    })
  } catch {
    return internalError()
  }
}
