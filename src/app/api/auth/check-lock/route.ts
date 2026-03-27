import { type NextRequest, NextResponse } from 'next/server'
import { isAccountLocked } from '@/lib/auth/rate-limit'

// GET /api/auth/check-lock?identifier={email}
// Usado ANTES do signInWithPassword para verificar se a conta está bloqueada (SEC-005)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const identifier = url.searchParams.get('identifier')

    if (!identifier) {
      return NextResponse.json({ locked: false })
    }

    const result = await isAccountLocked(identifier)
    return NextResponse.json(result)
  } catch {
    // Fail-safe: em caso de erro Redis, permitir tentativa (evitar block total)
    return NextResponse.json({ locked: false })
  }
}
