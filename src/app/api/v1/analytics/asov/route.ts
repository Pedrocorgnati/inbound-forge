import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { asovAggregate } from '@/lib/services/asov.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, response } = await requireSession()
  if (!user) return response as NextResponse

  const period = req.nextUrl.searchParams.get('period') ?? '30d'
  if (period !== '7d' && period !== '30d') {
    return validationError(new Error('period deve ser 7d ou 30d'))
  }

  try {
    const data = await asovAggregate(period)
    return ok(data)
  } catch (err) {
    console.error('[analytics.asov] error', err)
    return internalError()
  }
}
