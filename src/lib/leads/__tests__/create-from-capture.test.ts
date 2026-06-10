import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks das dependencias (prisma + servicos). vi.hoisted: a factory de vi.mock e
// elevada ao topo, entao os mocks precisam ser criados via vi.hoisted.
const { db, mockSubscribe } = vi.hoisted(() => ({
  db: {
    theme: { findFirst: vi.fn() },
    post: { findFirst: vi.fn() },
    lead: { findUnique: vi.fn(), create: vi.fn() },
    conversionEvent: { create: vi.fn() },
    emailSubscriber: { update: vi.fn() },
    leadFormSubmission: { create: vi.fn() },
    leadForm: { update: vi.fn() },
  },
  mockSubscribe: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: db }))
vi.mock('@/lib/email/subscriber', () => ({ subscribe: (...a: unknown[]) => mockSubscribe(...a) }))
vi.mock('@/lib/crypto', () => ({ encryptPII: (s: string) => `enc:${s}` }))
vi.mock('@/lib/pii/encrypt', () => ({ encryptPayload: (o: unknown) => `encp:${JSON.stringify(o)}` }))
vi.mock('@/lib/notifications/lead-captured.email', () => ({ sendLeadCapturedEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/ga4-measurement-protocol', () => ({ trackServerEvent: vi.fn().mockResolvedValue(undefined) }))

import { createLeadFromCapture } from '../create-from-capture'

beforeEach(() => {
  vi.clearAllMocks()
  mockSubscribe.mockResolvedValue({ subscriberId: 'sub-1', status: 'created' })
  db.leadFormSubmission.create.mockResolvedValue({ id: 'submission-1' })
  db.leadForm.update.mockResolvedValue({})
  db.emailSubscriber.update.mockResolvedValue({})
})

const input = { formId: 'form-1', email: 'a@b.com', lgpdConsent: true, source: 'form:newsletter' }

describe('createLeadFromCapture', () => {
  it('sempre inscreve o email + registra submissao, mesmo SEM Theme (Lead pulado)', async () => {
    db.theme.findFirst.mockResolvedValue(null) // projeto sem Theme
    const r = await createLeadFromCapture(input)
    expect(mockSubscribe).toHaveBeenCalledOnce()
    expect(db.lead.create).not.toHaveBeenCalled() // Lead pulado, sem quebrar
    expect(db.leadFormSubmission.create).toHaveBeenCalledOnce() // submissao SEMPRE
    expect(r.leadId).toBeNull()
    expect(r.subscriberId).toBe('sub-1')
    expect(r.submissionId).toBe('submission-1')
  })

  it('com Theme+Post e sem duplicata: cria Lead + ConversionEvent(FORM_SUBMISSION) + vincula subscriber', async () => {
    db.theme.findFirst.mockResolvedValue({ id: 'theme-1' })
    db.post.findFirst.mockResolvedValue({ id: 'post-1' })
    db.lead.findUnique.mockResolvedValue(null)
    db.lead.create.mockResolvedValue({ id: 'lead-1' })
    db.conversionEvent.create.mockResolvedValue({ id: 'conv-1' })

    const r = await createLeadFromCapture(input)
    expect(db.lead.create).toHaveBeenCalledOnce()
    expect(db.conversionEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'FORM_SUBMISSION', leadId: 'lead-1' }) }))
    expect(db.emailSubscriber.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { leadId: 'lead-1' } })
    expect(r.leadId).toBe('lead-1')
    expect(r.leadDuplicate).toBe(false)
  })

  it('contactHash duplicado: reusa lead existente, nao cria novo', async () => {
    db.theme.findFirst.mockResolvedValue({ id: 'theme-1' })
    db.post.findFirst.mockResolvedValue({ id: 'post-1' })
    db.lead.findUnique.mockResolvedValue({ id: 'lead-existing' })

    const r = await createLeadFromCapture(input)
    expect(db.lead.create).not.toHaveBeenCalled()
    expect(r.leadId).toBe('lead-existing')
    expect(r.leadDuplicate).toBe(true)
  })
})
