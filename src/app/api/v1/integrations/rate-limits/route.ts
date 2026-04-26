/**
 * TASK-10/ST001 (CL-216) — Agregador de rate-limit por integracao.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/api-auth'
import { INSTAGRAM_RATE_LIMITS } from '@/lib/constants/rate-limits'

type Provider = 'anthropic' | 'ideogram' | 'flux' | 'browserless' | 'instagram' | 'linkedin'

interface ProviderLimit {
  provider: Provider
  used: number
  limit: number
  resetAt: string
  status: 'ok' | 'warn' | 'critical'
}

const HOURLY_LIMITS: Record<Provider, number> = {
  anthropic: Number(process.env.ANTHROPIC_HOURLY_LIMIT ?? 100_000),
  ideogram: Number(process.env.IDEOGRAM_HOURLY_LIMIT ?? 500),
  flux: Number(process.env.FLUX_HOURLY_LIMIT ?? 200),
  browserless: Number(process.env.BROWSERLESS_HOURLY_LIMIT ?? 300),
  instagram: INSTAGRAM_RATE_LIMITS.requestsPerHour,
  linkedin: Number(process.env.LINKEDIN_HOURLY_LIMIT ?? 100),
}

function computeStatus(used: number, limit: number): 'ok' | 'warn' | 'critical' {
  const pct = limit > 0 ? used / limit : 0
  if (pct >= 0.9) return 'critical'
  if (pct >= 0.7) return 'warn'
  return 'ok'
}

export async function GET() {
  const { response } = await requireSession()
  if (response) return response

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const resetAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  const providers: Provider[] = ['anthropic', 'ideogram', 'flux', 'browserless', 'instagram', 'linkedin']
  const limits: ProviderLimit[] = []

  for (const provider of providers) {
    const agg = await prisma.apiUsageLog
      .aggregate({
        where: { service: provider, recordedAt: { gte: hourAgo } },
        _sum: { value: true },
      })
      .catch(() => ({ _sum: { value: 0 } }))
    const used = Number(agg._sum.value ?? 0)
    const limit = HOURLY_LIMITS[provider]
    limits.push({ provider, used, limit, resetAt, status: computeStatus(used, limit) })
  }

  return NextResponse.json(
    { success: true, data: limits },
    { headers: { 'Cache-Control': 'private, max-age=30' } }
  )
}
