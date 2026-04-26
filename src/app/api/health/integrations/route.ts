/**
 * GET /api/health/integrations
 * TASK-4 ST003 / CL-235, CL-236
 *
 * Retorna estado consolidado de Supabase e Redis.
 * Autenticado (operador) — nao e endpoint publico.
 * AUTH_001: exige sessao valida.
 */
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-auth'
import { redis } from '@/lib/redis'
import { getCircuitState } from '@/lib/redis/with-fallback'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ServiceStatus = 'ok' | 'degraded' | 'down'

async function checkSupabase(): Promise<ServiceStatus> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('operators').select('id').limit(1)
    return error ? 'degraded' : 'ok'
  } catch {
    return 'down'
  }
}

async function checkRedis(): Promise<ServiceStatus> {
  const circuit = getCircuitState()
  if (circuit === 'open') return 'down'
  if (circuit === 'half-open') return 'degraded'
  try {
    await redis.ping()
    return 'ok'
  } catch {
    return 'down'
  }
}

export async function GET() {
  const { response: authError } = await requireSession()
  if (authError) return authError

  const [supabase, redisStatus] = await Promise.allSettled([checkSupabase(), checkRedis()])

  const result = {
    supabase: supabase.status === 'fulfilled' ? supabase.value : ('down' as ServiceStatus),
    redis: redisStatus.status === 'fulfilled' ? redisStatus.value : ('down' as ServiceStatus),
    timestamp: new Date().toISOString(),
  }

  const overallOk = result.supabase === 'ok' && result.redis === 'ok'
  return NextResponse.json(result, { status: overallOk ? 200 : 207 })
}
