import { NextResponse } from 'next/server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { CREDENTIAL_PROVIDERS } from '@/constants/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { user, response } = await requireSession()
  if (!user) return response as NextResponse

  try {
    const statuses = CREDENTIAL_PROVIDERS.map((p) => {
      const raw = process.env[p.envVar] ?? ''
      const configured = raw.length > 0
      const masked = configured ? maskKey(raw) : null
      return {
        key: p.key,
        label: p.label,
        envVar: p.envVar,
        configured,
        masked,
      }
    })

    return ok({ providers: statuses })
  } catch (err) {
    console.error('[credentials/status] error', err)
    return internalError()
  }
}

function maskKey(value: string): string {
  if (value.length <= 8) return '••••'
  return `${value.slice(0, 4)}••••${value.slice(-4)}`
}
