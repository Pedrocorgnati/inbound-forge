import type { NextRequest } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { createSSEStream } from '@/lib/sse/broker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SSE stream of approval state changes (TAREFA-018, approvals channel).
 *
 * Push channel anchored on TAREFA-010 (approvals inbox): events are delivered
 * when the approvals producer calls
 * `publish('approvals', operatorId, { approvalId, state, at })` on
 * pending/approved/rejected transitions. The stream stays open with heartbeats
 * until a transition occurs (Zero Assumido: no synthetic approvals fabricated).
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { user, response } = await requireSession();
  if (!user) return response ?? new Response('Unauthorized', { status: 401 });

  return createSSEStream<'approvals'>({
    channel: 'approvals',
    operatorId: user.id,
    signal: request.signal,
  });
}
