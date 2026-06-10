/**
 * loop 05-27 TAREFA-028 (P3): MFA/TOTP opt-in — desativacao / recovery.
 *
 * POST { code }       -> desativa o MFA confirmando um codigo TOTP valido.
 * POST { backupCode }  -> caminho de recovery (perdeu o autenticador): consome um
 *                         backup code one-time e desativa o MFA.
 *
 * Em ambos os casos o(s) fator(es) TOTP sao removidos (unenroll) e os backup
 * codes restantes apagados. Exatamente um dos dois campos deve vir preenchido.
 */
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { redis, REDIS_TTL } from '@/lib/redis'
import { auditLog, AUDIT_ACTIONS } from '@/lib/audit'
import { hashBackupCode } from '@/lib/mfa'

const DisableSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[0-9]{6}$/, 'Codigo deve ter 6 digitos')
      .optional(),
    backupCode: z.string().trim().min(8, 'Backup code invalido').optional(),
  })
  .refine((v) => Boolean(v.code) !== Boolean(v.backupCode), {
    message: 'Informe um codigo TOTP OU um backup code (exatamente um)',
    path: ['code'],
  })

const MAX_ATTEMPTS = 5

async function checkRate(userId: string): Promise<boolean> {
  const key = `ratelimit:mfa-disable:${userId}`
  const attempts = await redis.incr(key)
  if (attempts === 1) await redis.expire(key, REDIS_TTL.rateLimitWindow)
  return attempts <= MAX_ATTEMPTS
}

async function unenrollAllTotp(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) return false
  // `all` cobre verificados e nao-verificados; remove qualquer fator TOTP.
  // fix do finding state_consistency/disable: checar o erro de CADA unenroll.
  // Antes o resultado era ignorado e a rota seguia apagando backup codes e
  // respondendo disabled:true mesmo com um fator TOTP ainda ativo.
  for (const factor of (data.all ?? []).filter((f) => f.factor_type === 'totp')) {
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
    if (unenrollError) return false
  }
  return true
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
  const parsed = DisableSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  if (!(await checkRate(userId))) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

  try {
    const supabase = await createClient()

    // ── Caminho recovery: backup code ──────────────────────────────────────
    if (parsed.data.backupCode) {
      const codeHash = hashBackupCode(parsed.data.backupCode)

      // 1. AUTORIZAR sem consumir: confirma que o codigo existe e nao foi usado.
      //    (fix regressao de lockout: o consumo atomico acontece DEPOIS do unenroll,
      //    para nao queimar o backup code se a remocao do fator falhar — senao o
      //    ultimo codigo de recuperacao seria perdido com o MFA ainda ativo.)
      const candidate = await prisma.mfaBackupCode.findFirst({
        where: { userId, codeHash, usedAt: null },
        select: { id: true },
      })
      if (!candidate) {
        return NextResponse.json({ error: 'INVALID_BACKUP_CODE' }, { status: 401 })
      }

      // 2. Acao critica primeiro: remover o(s) fator(es). Se falhar, o codigo NAO
      //    foi consumido (continua valido para retry) e os backup codes ficam.
      if (!(await unenrollAllTotp(supabase))) {
        return internalError('Nao foi possivel remover o fator MFA')
      }

      // 3. Consumo ATOMICO do codigo (updateMany por id + usedAt:null; count<=1
      //    impede double-spend numa corrida). Se uma requisicao concorrente ja
      //    consumiu (count 0), o MFA ja esta off (unenroll idempotente) — seguimos
      //    para a limpeza de qualquer forma.
      await prisma.mfaBackupCode.updateMany({
        where: { id: candidate.id, userId, usedAt: null },
        data: { usedAt: new Date() },
      })
      await prisma.mfaBackupCode.deleteMany({ where: { userId } })

      await auditLog({
        action: AUDIT_ACTIONS.MFA_RECOVERY_USED,
        entityType: 'User',
        entityId: userId,
        userId,
      })
      await auditLog({
        action: AUDIT_ACTIONS.MFA_DISABLED,
        entityType: 'User',
        entityId: userId,
        userId,
        metadata: { via: 'backup_code' },
      })

      return ok({ disabled: true, via: 'backup_code' })
    }

    // ── Caminho normal: codigo TOTP ────────────────────────────────────────
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
      code: parsed.data.code!,
    })
    if (verifyError) {
      return NextResponse.json({ error: 'INVALID_CODE' }, { status: 401 })
    }

    if (!(await unenrollAllTotp(supabase))) {
      return internalError('Nao foi possivel remover o fator MFA')
    }
    await prisma.mfaBackupCode.deleteMany({ where: { userId } })

    await auditLog({
      action: AUDIT_ACTIONS.MFA_DISABLED,
      entityType: 'User',
      entityId: userId,
      userId,
      metadata: { via: 'totp' },
    })

    return ok({ disabled: true, via: 'totp' })
  } catch {
    return internalError()
  }
}
