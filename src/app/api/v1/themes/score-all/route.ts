// POST /api/v1/themes/score-all
// Módulo: module-7-theme-scoring-engine (TASK-2/ST002)
// Recalcula scores de todos os temas em batch — max 1 execução simultânea via Redis lock
import { NextRequest } from 'next/server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { themeScoringService } from '@/services/theme-scoring.service'
import { redis } from '@/lib/redis'

const LOCK_KEY = 'theme:score-all:lock'
const LOCK_TTL_S = 60 // 60 segundos

export async function POST(_request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  // Verificar lock para prevenir execuções simultâneas
  let lockAcquired = false
  try {
    const set = await redis.set(LOCK_KEY, '1', { nx: true, ex: LOCK_TTL_S })
    lockAcquired = set === 'OK'
  } catch {
    // Se Redis indisponível, prosseguir sem lock (degraded mode)
    lockAcquired = true
  }

  if (!lockAcquired) {
    return ok(
      { error: 'Recálculo em andamento. Tente novamente em instantes.' },
      429
    )
  }

  try {
    const result = await themeScoringService.calculateScoresForAll()
    return ok({ updated: result.updated, durationMs: result.durationMs })
  } catch (err) {
    console.error('[POST /themes/score-all]', err)
    return internalError()
  } finally {
    // Liberar lock após execução
    try {
      await redis.del(LOCK_KEY)
    } catch {
      // Ignore — lock expira automaticamente via TTL
    }
  }
}
