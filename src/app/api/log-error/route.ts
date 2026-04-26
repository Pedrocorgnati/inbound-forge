import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { captureException } from '@/lib/sentry'

const LogErrorSchema = z.object({
  digest: z.string().optional(),
  message: z.string().max(500),
  route: z.string().max(300).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = LogErrorSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
    }

    // Obter userId da sessão (não do body — prevenção de spoofing)
    let userId: string | undefined
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    } catch {
      // Sessão indisponível não bloqueia o log
    }

    const { digest, message, route } = parsed.data

    captureException(new Error(`[client-error] ${message}`), {
      digest,
      route,
      userId,
      source: 'client-error-boundary',
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Nunca retornar 5xx — o endpoint de log não pode falhar silenciosamente
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
