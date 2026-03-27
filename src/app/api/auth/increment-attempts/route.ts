import { type NextRequest, NextResponse } from 'next/server'
import { incrementLoginAttempts, lockAccount } from '@/lib/auth/rate-limit'
import { BUSINESS_RULES } from '@/types/constants'

// POST /api/auth/increment-attempts
// Incrementa contador de tentativas falhas após signInWithPassword falhar
// SEC-005: bloqueia conta após MAX_LOGIN_ATTEMPTS tentativas
export async function POST(request: NextRequest) {
  try {
    const { identifier } = await request.json()

    if (!identifier || typeof identifier !== 'string') {
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
