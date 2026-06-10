import { describe, it, expect, vi, beforeEach } from 'vitest'

const { db, mockAlert } = vi.hoisted(() => ({
  db: {
    lead: { findUnique: vi.fn(), update: vi.fn() },
    conversionEvent: { findMany: vi.fn() },
    systemSetting: { findUnique: vi.fn() },
    leadScoreEvent: { create: vi.fn() },
  },
  mockAlert: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({ prisma: db }))
vi.mock('@/lib/alert-email', () => ({ sendAlertEmail: (...a: unknown[]) => mockAlert(...a) }))

import { computeScore, recomputeLeadScore, DEFAULT_SCORING_CONFIG } from '../lead-score'

beforeEach(() => {
  vi.clearAllMocks()
  db.systemSetting.findUnique.mockResolvedValue(null) // usa default
  db.lead.update.mockResolvedValue({})
  db.leadScoreEvent.create.mockResolvedValue({})
  mockAlert.mockResolvedValue(undefined)
})

describe('computeScore (puro)', () => {
  it('soma pontos de conversoes + perfil', () => {
    const s = computeScore({ name: 'Y', company: 'X', conversionTypes: ['MEETING', 'PROPOSAL'] })
    expect(s).toBe(40 + 60 + 10 + 5) // 115
  })
  it('tipos desconhecidos valem 0', () => {
    expect(computeScore({ conversionTypes: ['UNKNOWN'] })).toBe(0)
  })
})

describe('recomputeLeadScore', () => {
  it('promove NEW -> MQL ao cruzar o threshold (+ alerta + ledger)', async () => {
    db.lead.findUnique.mockResolvedValue({ id: 'l1', name: 'Y', company: 'X', status: 'NEW', score: 0, mqlAt: null })
    db.conversionEvent.findMany.mockResolvedValue([{ type: 'MEETING' }, { type: 'PROPOSAL' }]) // 100 + perfil 15 = 115 >= 100

    const r = await recomputeLeadScore('l1')
    expect(r?.score).toBe(115)
    expect(r?.mqlReached).toBe(true)
    expect(db.lead.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ score: 115, status: 'MQL', mqlAt: expect.any(Date) }) }))
    expect(db.leadScoreEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ newTotal: 115, reason: 'mql_reached' }) }))
    expect(mockAlert).toHaveBeenCalledOnce()
  })

  it('nao promove se abaixo do threshold; grava score sem mudar status', async () => {
    db.lead.findUnique.mockResolvedValue({ id: 'l2', name: 'Y', company: null, status: 'NEW', score: 0, mqlAt: null })
    db.conversionEvent.findMany.mockResolvedValue([{ type: 'FORM_SUBMISSION' }]) // 15 + nome 5 = 20

    const r = await recomputeLeadScore('l2')
    expect(r?.score).toBe(20)
    expect(r?.mqlReached).toBe(false)
    expect(db.lead.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ score: 20 }) }))
    expect(mockAlert).not.toHaveBeenCalled()
  })

  it('idempotente: score inalterado e nao-MQL => sem update', async () => {
    db.lead.findUnique.mockResolvedValue({ id: 'l3', name: 'Y', company: null, status: 'NEW', score: 20, mqlAt: null })
    db.conversionEvent.findMany.mockResolvedValue([{ type: 'FORM_SUBMISSION' }]) // 15 + 5 = 20 (igual)

    const r = await recomputeLeadScore('l3')
    expect(r?.score).toBe(20)
    expect(db.lead.update).not.toHaveBeenCalled()
  })

  it('lead inexistente => null', async () => {
    db.lead.findUnique.mockResolvedValue(null)
    expect(await recomputeLeadScore('nope')).toBeNull()
  })

  it('config default exposta', () => {
    expect(DEFAULT_SCORING_CONFIG.mqlThreshold).toBe(100)
  })
})
