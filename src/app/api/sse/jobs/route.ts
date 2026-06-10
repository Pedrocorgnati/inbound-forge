import type { NextRequest } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { createSSEStream } from '@/lib/sse/broker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SSE stream of job lifecycle events (TAREFA-018, jobs channel).
 *
 * Sourcing: push-only via the broker. Job producers call
 * `publish('jobs', operatorId, { jobId, status, progress, updatedAt })` on every
 * lifecycle transition (status do vocabulario universal de TAREFA-017:
 * queued|running|done|failed|cancelled). O registry de jobs
 * (`src/lib/jobs/registry.ts`) so expoe `getJobStatus(jobId)` por id — NAO ha
 * API de enumeracao por operador — logo o canal NAO deriva snapshot inicial
 * (Zero Assumido: nao se fabrica uma lista de jobs inexistente). A consulta
 * pontual continua via `GET /api/v1/jobs/[jobId]`; este canal entrega as
 * transicoes ao vivo. Quando uma enumeracao por operador for materializada,
 * adicionar `initial`/`onTick` aqui sem mudar o contrato do broker.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { user, response } = await requireSession();
  if (!user) return response ?? new Response('Unauthorized', { status: 401 });

  return createSSEStream<'jobs'>({
    channel: 'jobs',
    operatorId: user.id,
    signal: request.signal,
  });
}
