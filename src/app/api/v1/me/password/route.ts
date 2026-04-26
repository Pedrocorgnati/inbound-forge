/**
 * TASK-6 ST001 (CL-AU-017): self-service de alteracao de senha.
 * Revalida senha atual via Supabase signInWithPassword e atualiza via updateUser.
 * Rate-limit: 5 tentativas / 15min por userId (chave ratelimit:me-password:{userId}).
 */
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { auditLog, AUDIT_ACTIONS } from '@/lib/audit'
import { redis, REDIS_TTL } from '@/lib/redis'

const PasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual obrigatoria'),
  newPassword: z
    .string()
    .min(10, 'Minimo 10 caracteres')
    .regex(/[A-Za-z]/, 'Precisa conter letra')
    .regex(/[0-9]/, 'Precisa conter numero')
    .regex(/[^A-Za-z0-9]/, 'Precisa conter simbolo'),
})

const MAX_ATTEMPTS = 5

async function checkRate(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:me-password:${userId}`
  const attempts = await redis.incr(key)
  if (attempts === 1) {
    await redis.expire(key, REDIS_TTL.rateLimitWindow)
  }
  return { allowed: attempts <= MAX_ATTEMPTS, remaining: Math.max(0, MAX_ATTEMPTS - attempts) }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response
  const userId = user!.id
  const email = user!.email
  if (!email) return validationError(new Error('Usuario sem email cadastrado'))

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body invalido'))
  }
  const parsed = PasswordSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const rate = await checkRate(userId)
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED' },
      { status: 429 },
    )
  }

  try {
    const supabase = await createClient()
    // Revalida senha atual — signInWithPassword nao cria nova sessao com as mesmas cookies
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.currentPassword,
    })
    if (signInError) {
      return NextResponse.json({ error: 'INVALID_CURRENT_PASSWORD' }, { status: 401 })
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    })
    if (updateError) {
      return internalError('Nao foi possivel atualizar a senha')
    }

    await auditLog({
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      entityType: 'User',
      entityId: userId,
      userId,
    })

    return ok({ updated: true })
  } catch {
    return internalError()
  }
}
