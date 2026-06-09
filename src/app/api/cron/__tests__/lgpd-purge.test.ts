/**
 * CP-COMP-01 / DB-04 guard — o cron diario de LGPD deve rodar runRetentionCleanup
 * (anonimizacao + purga de DiagnosticoLead.rawText/ScrapedText/AlertLog/ApiUsageLog)
 * ANTES do purgeExpiredLeads (hard delete dos ja anonimizados). Antes do fix,
 * runRetentionCleanup nao tinha caller e a cadeia de retencao nunca iniciava.
 *
 * Teste unitario com prisma + servicos mockados (roda no CI, sem DB real).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockRunRetentionCleanup, mockPurgeExpiredLeads } = vi.hoisted(() => ({
  mockRunRetentionCleanup: vi.fn(),
  mockPurgeExpiredLeads: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/lgpd/retention', () => ({ runRetentionCleanup: mockRunRetentionCleanup }))
vi.mock('@/lib/services/lgpd-purge.service', () => ({ purgeExpiredLeads: mockPurgeExpiredLeads }))
vi.mock('@/lib/sentry', () => ({ captureException: vi.fn() }))

import { GET } from '../lgpd-purge/route'

const SECRET = 'test-cron-secret'
function req(auth?: string) {
  return new NextRequest('http://localhost/api/cron/lgpd-purge', {
    headers: auth ? { authorization: auth } : undefined,
  })
}

describe('cron/lgpd-purge GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = SECRET
    mockRunRetentionCleanup.mockResolvedValue({
      deleted: { DiagnosticoLeadRawText: 2, ScrapedText: 5, AlertLog: 0, ApiUsageLog: 0, Lead: 1 },
    })
    mockPurgeExpiredLeads.mockResolvedValue({
      leadsRemoved: 1,
      scrapedTextsRemoved: 0,
      cutoffAt: '2024-01-01T00:00:00.000Z',
      dryRun: false,
    })
  })

  it('401 fail-closed quando o Bearer nao bate', async () => {
    const res = await GET(req('Bearer wrong'))
    expect(res.status).toBe(401)
    expect(mockRunRetentionCleanup).not.toHaveBeenCalled()
    expect(mockPurgeExpiredLeads).not.toHaveBeenCalled()
  })

  it('roda runRetentionCleanup ANTES de purgeExpiredLeads e devolve ambos', async () => {
    const res = await GET(req(`Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    expect(mockRunRetentionCleanup).toHaveBeenCalledOnce()
    expect(mockPurgeExpiredLeads).toHaveBeenCalledOnce()
    expect(mockRunRetentionCleanup.mock.invocationCallOrder[0]).toBeLessThan(
      mockPurgeExpiredLeads.mock.invocationCallOrder[0],
    )
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.retention).toMatchObject({ DiagnosticoLeadRawText: 2 })
    expect(body.leadsRemoved).toBe(1)
  })
})
