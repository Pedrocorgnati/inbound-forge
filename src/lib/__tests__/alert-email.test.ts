/**
 * alert-email.test.ts
 * Rastreabilidade: NOTIF-001, TASK-4/ST004
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendAlertEmail, sendWorkerDownAlert, sendCostAlert } from '@/lib/alert-email'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    alertLog: {
      create: vi.fn().mockResolvedValue({ id: 'log-1' }),
    },
  },
}))

// Mock fetch global para simular Resend API
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('sendAlertEmail — sem configuração de email', () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY
    delete process.env.ALERT_EMAIL_TO
    mockFetch.mockClear()
  })

  it('emite console.warn e não lança exceção', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(
      sendAlertEmail({ subject: 'Teste', body: 'corpo' })
    ).resolves.not.toThrow()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[alert-email]')
    )
    warnSpy.mockRestore()
  })

  it('NÃO chama Resend API sem configuração', async () => {
    await sendAlertEmail({ subject: 'Teste', body: 'corpo' })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('cria AlertLog no banco mesmo sem email configurado', async () => {
    const { prisma } = await import('@/lib/prisma')
    await sendAlertEmail({
      subject: 'Worker offline',
      body: 'body',
      logType: 'worker_down',
      severity: 'CRITICAL',
    })
    expect(prisma.alertLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'worker_down',
          severity: 'CRITICAL',
        }),
      })
    )
  })
})

describe('sendAlertEmail — com configuração de email', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'resend_test_key'
    process.env.ALERT_EMAIL_TO = 'admin@example.com'
    mockFetch.mockResolvedValue({ ok: true, text: async () => '{}' })
  })

  afterEach(() => {
    delete process.env.RESEND_API_KEY
    delete process.env.ALERT_EMAIL_TO
  })

  it('chama Resend API com subject correto', async () => {
    await sendAlertEmail({
      subject: '⚠ Worker SCRAPING offline — ação necessária',
      body: 'corpo do alerta',
    })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer resend_test_key',
        }),
        body: expect.stringContaining('Worker SCRAPING'),
      })
    )
  })

  it('não lança exceção mesmo com erro na Resend API', async () => {
    mockFetch.mockResolvedValue({ ok: false, text: async () => 'error' })
    await expect(
      sendAlertEmail({ subject: 'Teste', body: 'corpo' })
    ).resolves.not.toThrow()
  })
})

describe('sendWorkerDownAlert — NOTIF-001', () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY
    mockFetch.mockClear()
  })

  it('subject inclui tipo de worker (NOTIF-001)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    process.env.RESEND_API_KEY = 'key'
    process.env.ALERT_EMAIL_TO = 'admin@test.com'
    mockFetch.mockResolvedValue({ ok: true, text: async () => '{}' })

    await sendWorkerDownAlert('SCRAPING', 'heartbeat timeout')

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.subject).toContain('SCRAPING')
    expect(callBody.subject).toContain('offline')

    delete process.env.RESEND_API_KEY
    delete process.env.ALERT_EMAIL_TO
    warnSpy.mockRestore()
  })

  it('logType é worker_down', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.alertLog.create).mockClear()

    await sendWorkerDownAlert('IMAGE')

    expect(prisma.alertLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'worker_down' }),
      })
    )
  })
})

describe('sendCostAlert', () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY
    mockFetch.mockClear()
  })

  it('subject diferente para exceeded vs warning', async () => {
    process.env.RESEND_API_KEY = 'key'
    process.env.ALERT_EMAIL_TO = 'admin@test.com'
    mockFetch.mockResolvedValue({ ok: true, text: async () => '{}' })

    await sendCostAlert('anthropic', 1.1, 110000, 100000)
    const callBody1 = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody1.subject).toContain('EXCEDIDO')
    mockFetch.mockClear()

    await sendCostAlert('anthropic', 0.85, 85000, 100000)
    const callBody2 = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody2.subject).toContain('próximo do limite')

    delete process.env.RESEND_API_KEY
    delete process.env.ALERT_EMAIL_TO
  })
})
