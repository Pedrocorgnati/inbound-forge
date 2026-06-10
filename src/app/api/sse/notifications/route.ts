import type { NextRequest } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { createSSEStream } from '@/lib/sse/broker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SSE stream of operator notifications (TAREFA-018, notifications channel).
 *
 * Push channel: events are delivered when producers call
 * `publish('notifications', operatorId, event)`. Until a producer is wired the
 * stream stays open with heartbeats (no synthetic data is fabricated; Zero
 * Assumido). See FLUID-COMPUTE.md for the producer contract.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { user, response } = await requireSession();
  if (!user) return response ?? new Response('Unauthorized', { status: 401 });

  return createSSEStream<'notifications'>({
    channel: 'notifications',
    operatorId: user.id,
    signal: request.signal,
  });
}
