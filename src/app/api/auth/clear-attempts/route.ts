import { type NextRequest, NextResponse } from 'next/server'
import { clearLoginAttempts } from '@/lib/auth/rate-limit'
import { requireSession } from '@/lib/api-auth'

// POST /api/auth/clear-attempts
// Limpa contador de tentativas após login bem-sucedido
// Chamado pelo useAuth.signIn após signInWithPassword retornar sucesso
// SEC: requer sessão ativa e identifier deve corresponder ao e-mail do usuário autenticado (A07)
export async function POST(request: NextRequest) {
  // SEC: exigir sessão — clear-attempts só faz sentido após login bem-sucedido
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  try {
    const { identifier } = await request.json()

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    // SEC: só permite limpar tentativas do próprio usuário autenticado
    if (identifier !== user!.email) {
      return NextResponse.json({ success: false }, { status: 403 })
    }

    await clearLoginAttempts(identifier)
    return NextResponse.json({ success: true })
  } catch {
    // Fail-safe: não bloquear fluxo de login por falha na limpeza
    return NextResponse.json({ success: false })
  }
}
