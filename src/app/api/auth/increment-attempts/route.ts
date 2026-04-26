import { type NextRequest, NextResponse } from 'next/server'
import { incrementLoginAttempts, lockAccount } from '@/lib/auth/rate-limit'
import { BUSINESS_RULES } from '@/types/constants'
import { redis } from '@/lib/redis'

// SEC: Rate-limit por IP para prevenir account-lockout DoS (A01/A04)
// Máx 10 chamadas por IP por janela de 5 minutos
const IP_RATELIMIT_WINDOW_SECONDS = 300
const IP_RATELIMIT_MAX_CALLS = 10

async function checkIpRateLimit(ip: string): Promise<boolean> {
  const key = `auth:ip-ratelimit:increment:${ip}`
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, IP_RATELIMIT_WINDOW_SECONDS)
  }
  return count <= IP_RATELIMIT_MAX_CALLS
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown'
}

// Validação básica de formato de e-mail
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST /api/auth/increment-attempts
// Incrementa contador de tentativas falhas após signInWithPassword falhar
// SEC-005: bloqueia conta após MAX_LOGIN_ATTEMPTS tentativas
// SEC: protegido por rate-limit por IP para prevenir DoS de bloqueio de conta
export async function POST(request: NextRequest) {
  try {
    // SEC: rate-limit por IP antes de processar
    const ip = getClientIp(request)
    const ipAllowed = await checkIpRateLimit(ip)
    if (!ipAllowed) {
      return NextResponse.json({ attempts: 0 }, { status: 429 })
    }

    const { identifier } = await request.json()

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json({ attempts: 0 }, { status: 400 })
    }

    // SEC: validar formato de e-mail para evitar enumeração via identificadores arbitrários
    if (!EMAIL_REGEX.test(identifier)) {
      return NextResponse.json({ attempts: 0 }, { status: 400 })
    }

    const attempts = await incrementLoginAttempts(identifier)

    // Se atingiu o limite, bloquear conta com duração progressiva (THREAT-001 / RN-016)
    if (attempts >= BUSINESS_RULES.MAX_LOGIN_ATTEMPTS) {
      await lockAccount(identifier, attempts)
    }

    return NextResponse.json({ attempts })
  } catch {
    // Fail-safe: não expor erro interno
    return NextResponse.json({ attempts: 0 })
  }
}
