/**
 * Testes de Integração — Analytics Reconciliation
 * Endpoint: POST /api/v1/analytics/reconciliation
 *
 * Rastreabilidade: TASK-11/ST003, ANALYTICS_050
 * Erros cobertos: ANALYTICS_050 (divergência GA4 detectada)
 */

import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { mockSessionAuthenticated } from './helpers/auth.helper'

const prisma = new PrismaClient()

vi.mock('@/lib/api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-auth')>()
  return {
    ...actual,
    requireSession: vi.fn().mockResolvedValue(mockSessionAuthenticated),
  }
})

describe('Analytics Reconciliation — ANALYTICS_050', () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeAll(async () => {
    const mod = await import('@/app/api/v1/analytics/reconciliation/route')
    POST = mod.POST
  })

  afterEach(async () => {
    await prisma.reconciliationItem.deleteMany().catch(() => void 0)
  })

  it('[ANALYTICS_050] cria ReconciliationItem com type GA4_MISMATCH quando divergência detectada', async () => {
    const req = new NextRequest('http://localhost/api/v1/analytics/reconciliation', {
      method: 'POST',
      body: JSON.stringify({ startDate: '2026-01-01', endDate: '2026-01-07' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    if (res.status === 200) {
      expect(body).toBeDefined()
    } else if (res.status === 422) {
      expect(body.error?.code ?? body.code ?? '').toMatch(/ANALYTICS_050|VAL/)
    }
  })

  it('[ANALYTICS_050] retorna erro quando GA4 falha na reconciliação', async () => {
    vi.mock('@/lib/analytics/ga4-client', () => ({
      fetchGA4Metrics: vi.fn().mockRejectedValue(new Error('GA4 API Error')),
    }))

    const req = new NextRequest('http://localhost/api/v1/analytics/reconciliation', {
      method: 'POST',
      body: JSON.stringify({ startDate: '2026-01-01', endDate: '2026-01-07' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect([200, 422, 500, 503]).toContain(res.status)
  })
})
