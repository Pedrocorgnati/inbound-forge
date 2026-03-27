import { type NextRequest, NextResponse } from 'next/server'
import { clearLoginAttempts } from '@/lib/auth/rate-limit'

// POST /api/auth/clear-attempts
// Limpa contador de tentativas após login bem-sucedido
// Chamado pelo useAuth.signIn após signInWithPassword retornar sucesso
export async function POST(request: NextRequest) {
  try {
    const { identifier } = await request.json()

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    await clearLoginAttempts(identifier)
    return NextResponse.json({ success: true })
  } catch {
    // Fail-safe: não bloquear fluxo de login por falha na limpeza
    return NextResponse.json({ success: false })
  }
}
