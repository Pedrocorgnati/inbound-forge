// ga4-measurement-protocol.ts — Eventos server-side via GA4 Measurement Protocol
// INT-106 | COMP-003: fire-and-forget | SEC-008: sem PII

import type { GA4EventName } from '@/constants/ga4-events'

const GA4_MP_ENDPOINT = 'https://www.google-analytics.com/mp/collect'

interface ServerEventParams {
  name: GA4EventName
  params?: Record<string, string | number | boolean>
  clientId?: string
}

/**
 * Envia evento ao GA4 via Measurement Protocol (server-side).
 * Fire-and-forget — falhas são silenciosas para não bloquear o fluxo.
 * clientId deve ser o _ga cookie do usuário (sem PII).
 */
export async function trackServerEvent({
  name,
  params = {},
  clientId = 'server-side',
}: ServerEventParams): Promise<void> {
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
  const apiSecret = process.env.GA4_API_SECRET

  if (!measurementId || !apiSecret) return

  try {
    await fetch(`${GA4_MP_ENDPOINT}?measurement_id=${measurementId}&api_secret=${apiSecret}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        events: [{ name, params }],
      }),
    })
  } catch {
    // silencioso — tracking não deve bloquear fluxo principal
  }
}
