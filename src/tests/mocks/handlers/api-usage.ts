/**
 * api-usage.ts — MSW handlers para /api/v1/api-usage/* (TASK-12 ST003)
 */
import { http, HttpResponse } from 'msw'

export const defaultApiUsage = [
  {
    service: 'anthropic',
    usedTokens: 1000,
    limitTokens: 100000,
    costUSD: 0.02,
    resetAt: '',
    percentUsed: 1,
  },
  {
    service: 'ideogram',
    usedTokens: 500,
    limitTokens: 50000,
    costUSD: 0.01,
    resetAt: '',
    percentUsed: 1,
  },
]

export const apiUsageHandlers = [
  http.get('*/api/v1/api-usage', () =>
    HttpResponse.json({ success: true, data: defaultApiUsage }),
  ),

  http.get('*/api/v1/api-usage/totals', () =>
    HttpResponse.json({
      success: true,
      data: { totalCostUSD: 0.03, alertThresholdReached: false, services: defaultApiUsage },
    }),
  ),

  http.post('*/api/v1/api-usage/log', () =>
    HttpResponse.json({ success: true, data: { ok: true } }),
  ),
]
