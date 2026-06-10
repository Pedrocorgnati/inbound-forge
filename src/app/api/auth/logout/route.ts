/**
 * Rastreabilidade: CL-261, TASK-8 ST004
 * Logout server-side: signOut Supabase + AuditLog.
 * Limpeza de cookies/IDB é feita no cliente via logout.ts helpers.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { auditLogout } from '@/lib/auth/logout'

export async function POST() {
  let userId: string | undefined
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id
    await supabase.auth.signOut()
  } catch {
    // Continuar mesmo se signOut falhar — cookie será inválido
  }

  if (userId) {
    auditLogout(userId).catch((err) => console.warn('[logout] audit error:', err))
  }

  return NextResponse.json({ success: true })
}
