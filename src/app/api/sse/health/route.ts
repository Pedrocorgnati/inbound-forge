import type { NextRequest } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { createSSEStream } from '@/lib/sse/broker';
import type { HealthEvent } from '@/lib/sse/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SSE stream of service health (TAREFA-018, health channel).
 *
 * Self-sourcing: emits a HealthEvent immediately and on every heartbeat tick,
 * so the connection liveness doubles as a health signal. Extend `probe()` to
 * fold in real dependency checks (DB, Redis) when available.
 */
function probe(): HealthEvent {
  return { status: 'ok', checkedAt: new Date().toISOString() };
}

export async function GET(request: NextRequest): Promise<Response> {
  const { user, response } = await requireSession();
  if (!user) return response ?? new Response('Unauthorized', { status: 401 });

  return createSSEStream<'health'>({
    channel: 'health',
    operatorId: user.id,
    signal: request.signal,
    onTick: () => [probe()],
  });
}
