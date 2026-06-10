import { describe, it, expect, vi, beforeEach } from 'vitest'

const { db, mockSend } = vi.hoisted(() => ({
  db: {
    nurtureSequence: { findMany: vi.fn() },
    nurtureEnrollment: { create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    nurtureSendLog: { create: vi.fn() },
    emailSubscriber: { findUnique: vi.fn() },
  },
  mockSend: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({ prisma: db }))
vi.mock('@/lib/email/marketing-send', () => ({ sendMarketingEmail: (...a: unknown[]) => mockSend(...a) }))
vi.mock('@/lib/email/subscriber', () => ({
  buildUnsubscribeUrl: () => 'http://app/api/unsubscribe?token=t',
  decryptSubscriberEmail: () => 'a@b.com',
}))
vi.mock('@/lib/email/subscriber-token', () => ({ mintSubscriberToken: () => 'tok' }))
vi.mock('@/lib/email/broadcast-sender', () => ({ injectUnsubscribe: (h: string) => h + ' http://app/api/unsubscribe?token=t' }))

import { enrollSubscriber, processNurtureTick } from '../nurture'

beforeEach(() => {
  vi.clearAllMocks()
  mockSend.mockResolvedValue({ ok: true, messageId: 'm1' })
  db.nurtureEnrollment.update.mockResolvedValue({})
  db.nurtureSendLog.create.mockResolvedValue({})
  db.nurtureEnrollment.create.mockResolvedValue({})
})

describe('enrollSubscriber', () => {
  it('inscreve em sequence ACTIVE com steps; ignora sem steps', async () => {
    db.nurtureSequence.findMany.mockResolvedValue([
      { id: 'seq-1', steps: [{ delayHours: 0 }] },
      { id: 'seq-2', steps: [] }, // sem steps -> ignorada
    ])
    const n = await enrollSubscriber('sub-1')
    expect(n).toBe(1)
    expect(db.nurtureEnrollment.create).toHaveBeenCalledOnce()
    expect(db.nurtureEnrollment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sequenceId: 'seq-1', subscriberId: 'sub-1', currentStep: 0 }) }))
  })
})

describe('processNurtureTick', () => {
  const enrollment = (currentStep: number, steps: { order: number }[]) => ({
    id: 'enr-1', currentStep, sequence: { steps },
  })

  it('envia o step devido a subscriber CONFIRMED e avanca quando ha proximo', async () => {
    db.nurtureEnrollment.findMany.mockResolvedValue([enrollment(0, [{ order: 0, subject: 's0', bodyHtml: 'b0', delayHours: 0 }, { order: 1, subject: 's1', bodyHtml: 'b1', delayHours: 24 }])])
    db.emailSubscriber.findUnique.mockResolvedValue({ id: 'sub-1', status: 'CONFIRMED', encryptedEmail: 'enc' })

    const r = await processNurtureTick()
    expect(mockSend).toHaveBeenCalledOnce()
    expect(r.sent).toBe(1)
    expect(db.nurtureSendLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SENT', stepOrder: 0 }) }))
    expect(db.nurtureEnrollment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ currentStep: 1 }) }))
  })

  it('subscriber NAO CONFIRMED: cancela a enrollment, nao envia', async () => {
    db.nurtureEnrollment.findMany.mockResolvedValue([enrollment(0, [{ order: 0, subject: 's', bodyHtml: 'b', delayHours: 0 }])])
    db.emailSubscriber.findUnique.mockResolvedValue({ id: 'sub-1', status: 'UNSUBSCRIBED', encryptedEmail: 'enc' })

    await processNurtureTick()
    expect(mockSend).not.toHaveBeenCalled()
    expect(db.nurtureEnrollment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELED' }) }))
  })

  it('ultimo step: marca COMPLETED', async () => {
    db.nurtureEnrollment.findMany.mockResolvedValue([enrollment(0, [{ order: 0, subject: 's', bodyHtml: 'b', delayHours: 0 }])])
    db.emailSubscriber.findUnique.mockResolvedValue({ id: 'sub-1', status: 'CONFIRMED', encryptedEmail: 'enc' })

    await processNurtureTick()
    expect(db.nurtureEnrollment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) }))
  })
})
