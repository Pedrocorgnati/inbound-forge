/**
 * loop 05-27 TAREFA-028 (P3): MFA/TOTP opt-in — ativacao.
 *
 * POST { factorId, code } -> cria um challenge e verifica o codigo TOTP de 6
 * digitos contra o fator enrolado em /setup. No sucesso o fator passa a
 * `verified` (a sessao sobe para AAL2) e geramos 10 backup codes one-time,
 * persistidos apenas como hash SHA-256, devolvidos UMA UNICA VEZ ao cliente.
 */
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { redis, REDIS_TTL } from '@/lib/redis'
import { auditLog, AUDIT_ACTIONS } from '@/lib/audit'
import { generateBackupCodes, hashBackupCode } from '@/lib/mfa'

const VerifySchema = z.object({
  factorId: z.string().min(1, 'factorId obrigatorio'),
  code: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, 'Codigo deve ter 6 digitos'),
})

const MAX_ATTEMPTS = 5

async function checkRate(userId: string): Promise<boolean> {
  const key = `ratelimit:mfa-verify:${userId}`
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
  const parsed = VerifySchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  if (!(await checkRate(userId))) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

  try {
    const supabase = await createClient()

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: parsed.data.factorId,
    })
    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'CHALLENGE_FAILED' }, { status: 400 })
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: parsed.data.factorId,
      challengeId: challenge.id,
      code: parsed.data.code,
    })
    if (verifyError) {
      return NextResponse.json({ error: 'INVALID_CODE' }, { status: 401 })
    }

    // Fator verificado: (re)gera backup codes. Remove os antigos do usuario para
    // garantir um unico conjunto valido por vez.
    // fix do finding state_consistency/enable: o fator ja foi ATIVADO pelo verify
    // acima (a sessao subiu para AAL2). Se a persistencia dos backup codes falhar,
    // compensamos desfazendo o enroll, para nao deixar o usuario com MFA ativo e
    // zero backup codes (invariante: MFA ativo <-> existe conjunto de backup codes).
    const codes = generateBackupCodes()
    try {
      await prisma.$transaction([
        prisma.mfaBackupCode.deleteMany({ where: { userId } }),
        prisma.mfaBackupCode.createMany({
          data: codes.map((code) => ({ userId, codeHash: hashBackupCode(code) })),
        }),
      ])
    } catch (persistError) {
      // Compensacao best-effort. supabase.auth.mfa.unenroll NAO lanca — retorna
      // { error } — entao checamos o retorno (alem do catch) e logamos se a reversao
      // falhar, para nao silenciar um estado "MFA ativo sem backup codes" (Zero
      // Silencio / observabilidade).
      try {
        const { error: unenrollError } = await supabase.auth.mfa.unenroll({
          factorId: parsed.data.factorId,
        })
        if (unenrollError) {
          console.error(
            `[mfa/verify] compensacao falhou: factor ${parsed.data.factorId} permanece ` +
              `ativo SEM backup codes (userId=${userId}):`,
            unenrollError.message,
          )
        }
      } catch (compensationError) {
        console.error(
          `[mfa/verify] compensacao lancou excecao (userId=${userId}):`,
          compensationError instanceof Error ? compensationError.message : 'unknown',
        )
      }
      throw persistError
    }

    await auditLog({
      action: AUDIT_ACTIONS.MFA_ENABLED,
      entityType: 'User',
      entityId: userId,
      userId,
    })

    return ok({ enabled: true, backupCodes: codes })
  } catch {
    return internalError()
  }
}
