import { describe, it, expect, vi, beforeEach } from 'vitest'

const { db, mockAlert, mockEnroll } = vi.hoisted(() => ({
  db: {
    automationRule: { findMany: vi.fn() },
    automationRun: { create: vi.fn() },
    lead: { update: vi.fn() },
    emailSubscriber: { findFirst: vi.fn() },
  },
  mockAlert: vi.fn(),
  mockEnroll: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({ prisma: db }))
vi.mock('@/lib/alert-email', () => ({ sendAlertEmail: (...a: unknown[]) => mockAlert(...a) }))
vi.mock('@/lib/email/nurture', () => ({ enrollInSequence: (...a: unknown[]) => mockEnroll(...a) }))

import { emitAutomationEvent } from '../engine'

const rule = (over: Record<string, unknown>) => ({ id: 'r1', name: 'R', enabled: true, trigger: 'LEAD_CREATED', actionType: 'NOTIFY', actionConfig: null, ...over })

beforeEach(() => {
  vi.clearAllMocks()
  db.automationRun.create.mockResolvedValue({})
  db.lead.update.mockResolvedValue({})
  mockAlert.mockResolvedValue(undefined)
  mockEnroll.mockResolvedValue(true)
})

describe('emitAutomationEvent', () => {
  it('NOTIFY: envia alerta + grava run SUCCESS', async () => {
    db.automationRule.findMany.mockResolvedValue([rule({ actionType: 'NOTIFY' })])
    await emitAutomationEvent('LEAD_CREATED', { leadId: 'l1' })
    expect(mockAlert).toHaveBeenCalledOnce()
    expect(db.automationRun.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SUCCESS', entityId: 'l1' }) }))
  })

  it('SET_FUNNEL_STAGE: atualiza o lead', async () => {
    db.automationRule.findMany.mockResolvedValue([rule({ actionType: 'SET_FUNNEL_STAGE', actionConfig: { funnelStage: 'DECISION' } })])
    await emitAutomationEvent('LEAD_MQL', { leadId: 'l2' })
    expect(db.lead.update).toHaveBeenCalledWith({ where: { id: 'l2' }, data: { funnelStage: 'DECISION' } })
    expect(db.automationRun.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SUCCESS' }) }))
  })

  it('SET_FUNNEL_STAGE invalido: SKIPPED, sem update', async () => {
    db.automationRule.findMany.mockResolvedValue([rule({ actionType: 'SET_FUNNEL_STAGE', actionConfig: { funnelStage: 'BOGUS' } })])
    await emitAutomationEvent('LEAD_MQL', { leadId: 'l3' })
    expect(db.lead.update).not.toHaveBeenCalled()
    expect(db.automationRun.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SKIPPED' }) }))
  })

  it('ENROLL_SEQUENCE: resolve subscriber do lead e inscreve', async () => {
    db.automationRule.findMany.mockResolvedValue([rule({ actionType: 'ENROLL_SEQUENCE', actionConfig: { sequenceId: 'seq-1' } })])
    db.emailSubscriber.findFirst.mockResolvedValue({ id: 'sub-1' })
    await emitAutomationEvent('LEAD_MQL', { leadId: 'l4' })
    expect(mockEnroll).toHaveBeenCalledWith('sub-1', 'seq-1')
  })

  it('ENROLL_SEQUENCE sem subscriber: SKIPPED', async () => {
    db.automationRule.findMany.mockResolvedValue([rule({ actionType: 'ENROLL_SEQUENCE', actionConfig: { sequenceId: 'seq-1' } })])
    db.emailSubscriber.findFirst.mockResolvedValue(null)
    await emitAutomationEvent('LEAD_MQL', { leadId: 'l5' })
    expect(mockEnroll).not.toHaveBeenCalled()
    expect(db.automationRun.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SKIPPED' }) }))
  })

  it('sem regras: no-op', async () => {
    db.automationRule.findMany.mockResolvedValue([])
    await emitAutomationEvent('LEAD_CREATED', { leadId: 'l6' })
    expect(db.automationRun.create).not.toHaveBeenCalled()
  })
})
