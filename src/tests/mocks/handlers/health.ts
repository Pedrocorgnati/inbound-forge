/**
 * health.ts — MSW handlers para /api/v1/health/* (TASK-12 ST003)
 */
import { http, HttpResponse } from 'msw'

export const defaultHealth = {
  status: 'ok' as const,
  services: { database: 'ok', redis: 'ok' },
  workers: [
    { workerId: 'w-1', type: 'SCRAPING', status: 'IDLE', lastPing: new Date().toISOString() },
    { workerId: 'w-2', type: 'IMAGE', status: 'IDLE', lastPing: new Date().toISOString() },
    { workerId: 'w-3', type: 'PUBLISHING', status: 'IDLE', lastPing: new Date().toISOString() },
  ],
  alerts: [] as unknown[],
  apiUsage: [] as unknown[],
  errorHistory: [] as unknown[],
  updatedAt: new Date().toISOString(),
}

export const healthHandlers = [
  http.get('*/api/v1/health', () => HttpResponse.json({ success: true, data: defaultHealth })),

  http.get('*/api/v1/health/detailed', () =>
    HttpResponse.json({ success: true, data: defaultHealth }),
  ),

  http.post('*/api/v1/health/heartbeat', () =>
    HttpResponse.json({ success: true, data: { received: true } }),
  ),

  http.patch('*/api/v1/health/alerts/:id', ({ params }) =>
    HttpResponse.json({ success: true, data: { id: params.id, resolved: true } }),
  ),
]
