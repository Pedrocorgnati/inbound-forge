// GET /api/v1/settings/api-keys/status — resumo das credenciais (TASK-8 ST004 / CL-249)

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, internalError } from '@/lib/api-auth'

const PROVIDERS = ['instagram', 'openai', 'anthropic', 'ga4'] as const
const SETTING_PREFIX = 'apiKey.'
const DAY_MS = 24 * 60 * 60 * 1000

type Status = 'OK' | 'WARN' | 'CRITICAL' | 'FAILED' | 'MISSING'

function classify(
  lastTestStatus: string | undefined,
  tokenExpiresAt: string | undefined,
): { status: Status; days?: number; message: string } {
  if (lastTestStatus === 'FAILED') {
    return { status: 'FAILED', message: 'Ultimo teste falhou.' }
  }
  if (!tokenExpiresAt) {
    return { status: 'OK', message: 'OK (sem data de expiracao conhecida).' }
  }
  const expiresAt = new Date(tokenExpiresAt)
  if (isNaN(expiresAt.getTime())) {
    return { status: 'OK', message: 'OK.' }
  }
  const days = Math.floor((expiresAt.getTime() - Date.now()) / DAY_MS)
  if (days <= 3) return { status: 'CRITICAL', days, message: `Expira em ${days} dia(s).` }
  if (days <= 7) return { status: 'WARN', days, message: `Expira em ${days} dias.` }
  return { status: 'OK', days, message: 'OK.' }
}

export async function GET() {
  const { response } = await requireSession()
  if (response) return response

  try {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: PROVIDERS.map((p) => SETTING_PREFIX + p) } },
    })

    const items = settings
      .map((row) => {
        const meta = (row.value as Record<string, unknown> | null) ?? {}
        const provider = row.key.slice(SETTING_PREFIX.length)
        const lastTestStatus = typeof meta.lastTestStatus === 'string' ? meta.lastTestStatus : undefined
        const tokenExpiresAt = typeof meta.tokenExpiresAt === 'string' ? meta.tokenExpiresAt : undefined
        const { status, days, message } = classify(lastTestStatus, tokenExpiresAt)
        return {
          provider,
          status,
          message,
          daysUntilExpiration: days,
          lastTestedAt: typeof meta.lastTestedAt === 'string' ? meta.lastTestedAt : null,
        }
      })
      .filter((i) => i.status !== 'OK')

    return NextResponse.json({ success: true, items })
  } catch {
    return internalError()
  }
}
