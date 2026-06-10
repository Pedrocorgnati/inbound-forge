import type { NextRequest } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { createSSEStream } from '@/lib/sse/broker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SSE stream of queue depth (TAREFA-018, queue channel).
 *
 * Sourcing: push-only via the broker. Producers que mutam a fila chamam
 * `publish('queue', operatorId, { pending, running, failed, at })` apos cada
 * mudanca de profundidade. O registry de jobs (`src/lib/jobs/registry.ts`) NAO
 * expoe enumeracao por operador, logo o canal NAO deriva contagens por tick a
 * partir de uma lista inexistente (Zero Assumido). Quando uma agregacao de fila
 * por operador for materializada, adicionar `onTick` aqui sem mudar o broker.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { user, response } = await requireSession();
  if (!user) return response ?? new Response('Unauthorized', { status: 401 });

  return createSSEStream<'queue'>({
    channel: 'queue',
    operatorId: user.id,
    signal: request.signal,
  });
}
