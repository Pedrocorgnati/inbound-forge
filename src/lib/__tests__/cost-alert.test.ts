import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkCostAlerts, getServiceLimits } from '../cost-alert'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    apiUsageLog: {
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    alertLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

const mockAggregate = vi.mocked(prisma.apiUsageLog.aggregate)
const mockCount = vi.mocked(prisma.apiUsageLog.count)
const mockFindFirst = vi.mocked(prisma.alertLog.findFirst)
const mockCreate = vi.mocked(prisma.alertLog.create)

const LIMIT = getServiceLimits().anthropic // 1_000_000 tokens by default

function mockUsageAt(percent: number) {
  const value = Math.round(LIMIT * percent)
  mockAggregate.mockResolvedValue({ _sum: { value } } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFindFirst.mockResolvedValue(null)
  mockCreate.mockResolvedValue({} as never)
})

// Cenário 1 — [SUCCESS] Abaixo do threshold (79%)
it('DADO uso de Anthropic em 79% do limite, QUANDO checkCostAlerts, ENTÃO nenhum AlertLog criado', async () => {
  mockUsageAt(0.79)

  await checkCostAlerts('anthropic', 'op-1')

  expect(mockCreate).not.toHaveBeenCalled()
})

// Cenário 2 — [SUCCESS] Exatamente no threshold (80%)
it('DADO uso de Anthropic em 80%, QUANDO checkCostAlerts, ENTÃO AlertLog criado com type cost_threshold e usagePercent 80', async () => {
  mockUsageAt(0.8)

  await checkCostAlerts('anthropic', 'op-1')

  expect(mockCreate).toHaveBeenCalledOnce()
  const data = mockCreate.mock.calls[0][0].data
  expect(data.type).toBe('cost_threshold:anthropic')
  expect(data.severity).toBe('warning')
  expect(data.message).toContain('80%')
  expect(data.message).toContain('usagePercent=80')
})

// Cenário 3 — [EDGE] Segundo check a 85% com alerta ativo — sem duplicação
it('DADO segundo check com alerta cost_threshold ativo (resolved=false), QUANDO checkCostAlerts a 85%, ENTÃO nenhum alerta adicional criado', async () => {
  mockUsageAt(0.85)
  // Simula alerta já existente
  mockFindFirst.mockResolvedValue({ id: 'alert-1', resolved: false } as never)

  await checkCostAlerts('anthropic', 'op-1')

  expect(mockCreate).not.toHaveBeenCalled()
})

// Cenário 4 — [SUCCESS] Limite excedido (100%)
it('DADO uso em 100%, QUANDO checkCostAlerts, ENTÃO AlertLog criado com type cost_exceeded', async () => {
  mockUsageAt(1.0)

  await checkCostAlerts('anthropic', 'op-1')

  expect(mockCreate).toHaveBeenCalledOnce()
  const data = mockCreate.mock.calls[0][0].data
  expect(data.type).toBe('cost_exceeded:anthropic')
  expect(data.severity).toBe('critical')
  expect(data.message).toContain('usagePercent=100')
})

// Cenário 5 — [COMPLIANCE] metadata não contém PII
it('DADO AlertLog criado, ENTÃO message inclui service, usagePercent, threshold — sem PII', async () => {
  mockUsageAt(0.8)

  await checkCostAlerts('anthropic', 'op-1')

  const data = mockCreate.mock.calls[0][0].data
  expect(data.message).toContain('service=anthropic')
  expect(data.message).toContain('threshold=0.8')
  // Não contém nome do operador ou dados de conteúdo
  expect(data.message).not.toContain('op-1')
})

// Cenário extra — serviço desconhecido não cria alerta
it('DADO serviço sem limite configurado, QUANDO checkCostAlerts, ENTÃO nenhum alerta criado', async () => {
  await checkCostAlerts('unknown-service', 'op-1')

  expect(mockAggregate).not.toHaveBeenCalled()
  expect(mockCreate).not.toHaveBeenCalled()
})
