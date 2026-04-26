import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateCsrfToken, setCsrfCookie } from '@/lib/auth/csrf-token'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { code: 'SESSION_REQUIRED', message: 'Sessao requerida para emitir CSRF token' },
      { status: 401 }
    )
  }

  const token = generateCsrfToken(user.id)
  const response = NextResponse.json({ token, expiresInSec: 24 * 60 * 60 })
  return setCsrfCookie(response, token)
}
