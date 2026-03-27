import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_001', message: 'Não autenticado' } },
        { status: 401 }
      )
    }

    // SEC-008: retornar apenas dados mínimos necessários — nunca hash, tokens, metadata completo
    return NextResponse.json({
      success: true,
      data: { user: { id: user.id, email: user.email } },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_001', message: 'Não autenticado' } },
      { status: 401 }
    )
  }
}
