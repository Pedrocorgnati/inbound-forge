/**
 * TASK-6 ST002 (CL-AU-018): self-service de alteracao de email.
 * Exige senha atual; Supabase dispara email de confirmacao para o novo endereco.
 */
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { auditLog, AUDIT_ACTIONS } from '@/lib/audit'
import { redis, REDIS_TTL } from '@/lib/redis'

const EmailSchema = z.object({
  currentPassword: z.string().min(1),
  newEmail: z.string().email(),
})

const MAX_ATTEMPTS = 5

async function checkRate(userId: string): Promise<boolean> {
  const key = `ratelimit:me-email:${userId}`
  const attempts = await redis.incr(key)
  if (attempts === 1) {
    await redis.expire(key, REDIS_TTL.rateLimitWindow)
  }
  return attempts <= MAX_ATTEMPTS
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response
  const userId = user!.id
  const currentEmail = user!.email
  if (!currentEmail) return validationError(new Error('Usuario sem email cadastrado'))

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body invalido'))
  }
  const parsed = EmailSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  if (parsed.data.newEmail.toLowerCase() === currentEmail.toLowerCase()) {
    return validationError(new Error('Novo email deve ser diferente do atual'))
  }

  if (!(await checkRate(userId))) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

  try {
    const supabase = await createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password: parsed.data.currentPassword,
    })
    if (signInError) {
      return NextResponse.json({ error: 'INVALID_CURRENT_PASSWORD' }, { status: 401 })
    }

    const { error: updateError } = await supabase.auth.updateUser({
      email: parsed.data.newEmail,
    })
    if (updateError) {
      return internalError('Nao foi possivel iniciar a troca de email')
    }

    await auditLog({
      action: AUDIT_ACTIONS.EMAIL_CHANGE_REQUESTED,
      entityType: 'User',
      entityId: userId,
      userId,
      metadata: { newEmailDomain: parsed.data.newEmail.split('@')[1] ?? null },
    })

    return ok({ pendingConfirmation: true })
  } catch {
    return internalError()
  }
}
