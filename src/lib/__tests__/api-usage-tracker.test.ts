import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trackApiUsage } from '../api-usage-tracker'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    apiUsageLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    del: vi.fn(),
  },
}))

vi.mock('@/lib/cost-alert', () => ({
  checkCostAlerts: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { checkCostAlerts } from '@/lib/cost-alert'

const mockCreate = vi.mocked(prisma.apiUsageLog.create)
const mockDel = vi.mocked(redis.del)
const mockCheckAlerts = vi.mocked(checkCostAlerts)

beforeEach(() => {
  vi.clearAllMocks()
})

// [SUCCESS] Claude 1000 tokens, custo $0.03
it('DADO Claude chamado com 1000 tokens e custo $0.03, QUANDO trackApiUsage, ENTÃO log criado + cache invalidado + checkCostAlerts fire-and-forget', async () => {
  mockCreate.mockResolvedValue({} as never)
  mockDel.mockResolvedValue(1 as never)
  mockCheckAlerts.mockResolvedValue(undefined)

  await trackApiUsage({
    service: 'anthropic',
    tokens: 1000,
    costUSD: 0.03,
    operatorId: 'op-1',
  })

  expect(mockCreate).toHaveBeenCalledWith({
    data: { service: 'anthropic', metric: 'tokens', value: 1000, cost: 0.03 },
  })
  expect(mockDel).toHaveBeenCalledWith('api-usage:op-1:month')
  // checkCostAlerts é fire-and-forget — verifica que foi chamado (sem await garantido)
  await vi.runAllTimersAsync?.()
  expect(mockCheckAlerts).toHaveBeenCalledWith('anthropic', 'op-1')
})

// [ERROR] DB offline — erro propagado, não silenciado
it('DADO DB offline, QUANDO trackApiUsage, ENTÃO erro propagado para o caller', async () => {
  mockCreate.mockRejectedValue(new Error('connection refused'))

  await expect(
    trackApiUsage({ service: 'ideogram', costUSD: 0.05, operatorId: 'op-1' })
  ).rejects.toThrow('connection refused')

  // Cache NÃO deve ser invalidado se o create falhar
  expect(mockDel).not.toHaveBeenCalled()
})

// [EDGE] Mesmo operationId enviado duas vezes (worker retry) — dois registros criados
it('DADO mesmo operationId enviado duas vezes, QUANDO inserir, ENTÃO dois registros criados (sem unique constraint)', async () => {
  mockCreate.mockResolvedValue({} as never)
  mockDel.mockResolvedValue(1 as never)
  mockCheckAlerts.mockResolvedValue(undefined)

  const params = {
    service: 'flux' as const,
    costUSD: 0.01,
    operatorId: 'op-2',
    operationId: 'op-duplicate-123',
  }

  await trackApiUsage(params)
  await trackApiUsage(params)

  expect(mockCreate).toHaveBeenCalledTimes(2)
})

// [EDGE] checkCostAlerts lançando erro — NÃO propaga para trackApiUsage
it('DADO checkCostAlerts lançando erro, QUANDO trackApiUsage, ENTÃO trackApiUsage retorna normalmente', async () => {
  mockCreate.mockResolvedValue({} as never)
  mockDel.mockResolvedValue(1 as never)
  mockCheckAlerts.mockRejectedValue(new Error('redis timeout'))

  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  // NÃO deve lançar erro
  await expect(
    trackApiUsage({ service: 'browserless', costUSD: 0.02, operatorId: 'op-3' })
  ).resolves.toBeUndefined()

  consoleSpy.mockRestore()
})

// [COMPLIANCE] TTL 90 dias documentado (COMP-004) — cron será implementado em module-16
it('DADO ApiUsageLog criado, ENTÃO não contém PII — apenas service, metric, value, cost', async () => {
  mockCreate.mockResolvedValue({} as never)
  mockDel.mockResolvedValue(1 as never)
  mockCheckAlerts.mockResolvedValue(undefined)

  await trackApiUsage({
    service: 'instagram',
    costUSD: 0.0,
    operatorId: 'op-4',
  })

  const callData = mockCreate.mock.calls[0][0].data
  expect(callData).not.toHaveProperty('operatorId')
  expect(callData).not.toHaveProperty('operationId')
  expect(callData).toHaveProperty('service', 'instagram')
  expect(callData).toHaveProperty('metric', 'requests')
  expect(callData).toHaveProperty('cost', 0.0)
})
