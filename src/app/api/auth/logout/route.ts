import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    // Cookie é limpo automaticamente pelo Supabase SSR
  } catch {
    // Continuar mesmo se signOut falhar — cookie será inválido de qualquer forma
  }

  // Retornar sucesso (redirect é feito pelo cliente via useAuth.signOut)
  return NextResponse.json({ success: true })
}
