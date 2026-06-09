/**
 * TAREFA-017: Endpoint universal de jobs.
 *
 *   GET    /api/v1/jobs/[jobId]  -> status consolidado do job
 *   DELETE /api/v1/jobs/[jobId]  -> solicita cancelamento (cancellation_requested)
 *
 * Consolida sob um job_id unico o status dos jobs por-tipo existentes
 * (image-jobs, video-jobs, worker_jobs). Contrato de leitura estabilizado aqui;
 * a exibicao de status nas UIs (poll/SSE) e responsabilidade de TAREFA-018.
 *
 * Cadencia de polling fallback recomendada: 2000ms enquanto o SSE de TAREFA-018
 * (heartbeat 25s) nao estiver ativo. Nenhum valor de polling e hardcoded em UI
 * por esta rota — o intervalo e apenas documentado aqui para os consumidores.
 *
 * Forma do GET (200):
 *   { status, progress, started_at, finished_at, error_code, correlation_id,
 *     cancellation_requested }
 *   - status: queued | running | done | failed | cancelled
 *   - progress: number 0..100 | null (null quando o produtor nao reporta)
 *
 * Sad paths (corpo tipado { error_code, message, correlation_id }):
 *   - 401 sessao ausente/invalida (JOB_401)
 *   - 404 job inexistente (JOB_404)
 *   - 409 DELETE sobre job terminal done|failed|cancelled (JOB_409)
 *   - 503 registry indisponivel apos retry (JOB_503)
 *
 * DELETE: 202 quando a transicao para cancellation_requested ocorre nesta
 * chamada; 200 quando o job ja estava em cancellation_requested (idempotente).
 * Idempotency-Key (UUID v7) e obrigatorio no DELETE (contrato de TAREFA-019,
 * aplicado via withIdempotency): 400 tipado quando ausente/invalido.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-auth'
import {
  getJobStatus,
  requestCancellation,
  JobNotFoundError,
  JobTerminalError,
  JobRegistryUnavailableError,
  JOB_ERROR_CODES,
} from '@/lib/jobs/registry'
import { withIdempotency } from '@/lib/idempotency/middleware'

type Params = { params: Promise<{ jobId: string }> }

function errorBody(errorCode: string, message: string, correlationId: string, status: number) {
  return NextResponse.json(
    { error_code: errorCode, message, correlation_id: correlationId },
    { status },
  )
}

function unauthorized(correlationId: string) {
  return errorBody(JOB_ERROR_CODES.UNAUTHORIZED, 'Sessao ausente ou invalida.', correlationId, 401)
}

// GET /api/v1/jobs/[jobId]
export async function GET(_request: NextRequest, { params }: Params) {
  const { jobId } = await params

  const { user, response } = await requireSession()
  if (response || !user) return unauthorized(jobId)

  try {
    const view = await getJobStatus(jobId)
    return NextResponse.json(
      {
        status: view.status,
        progress: view.progress,
        started_at: view.started_at,
        finished_at: view.finished_at,
        error_code: view.error_code,
        correlation_id: view.correlation_id,
        cancellation_requested: view.cancellation_requested,
      },
      { status: 200 },
    )
  } catch (err) {
    if (err instanceof JobNotFoundError) {
      return errorBody(err.code, err.message, jobId, 404)
    }
    if (err instanceof JobRegistryUnavailableError) {
      return errorBody(err.code, err.message, jobId, 503)
    }
    // Falha nao prevista: nunca corpo vazio (Zero Silencio).
    return errorBody(JOB_ERROR_CODES.UNAVAILABLE, 'Erro inesperado ao ler o job.', jobId, 503)
  }
}

// DELETE /api/v1/jobs/[jobId]
export async function DELETE(request: NextRequest, { params }: Params) {
  const { jobId } = await params

  const { user, response } = await requireSession()
  if (response || !user) return unauthorized(jobId)

  return withIdempotency(request, {
    userId: user.id,
    handler: async () => {
      try {
        const { alreadyRequested, status } = await requestCancellation(jobId)
        return NextResponse.json(
          {
            status: 'cancellation_requested',
            job_status: status,
            correlation_id: jobId,
          },
          { status: alreadyRequested ? 200 : 202 },
        )
      } catch (err) {
        if (err instanceof JobNotFoundError) {
          return errorBody(err.code, err.message, jobId, 404)
        }
        if (err instanceof JobTerminalError) {
          return NextResponse.json(
            {
              error_code: err.code,
              message: err.message,
              correlation_id: jobId,
              status: err.status,
            },
            { status: 409 },
          )
        }
        if (err instanceof JobRegistryUnavailableError) {
          return errorBody(err.code, err.message, jobId, 503)
        }
        return errorBody(JOB_ERROR_CODES.UNAVAILABLE, 'Erro inesperado ao cancelar o job.', jobId, 503)
      }
    },
  })
}
