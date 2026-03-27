/**
 * Tests: Batch Processor
 * TASK-2 ST002 / module-6-scraping-worker
 * Cobertura: SUCCESS, ERROR, EDGE, DEGRADED
 *
 * Prisma, Redis e classifyText são mockados para testar lógica de batch.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock classifyText
vi.mock('../classifier', () => ({
  classifyText: vi.fn(),
}))

// Mock Redis
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    set: vi.fn().mockResolvedValue('OK'),
  })),
}))

// Mock Prisma
vi.mock('../db', () => {
  const mockFindMany = vi.fn()
  const mockCreate = vi.fn().mockResolvedValue({})

  return {
    getPrisma: vi.fn().mockReturnValue({
      scrapedText: { findMany: mockFindMany },
      alertLog: { create: mockCreate },
    }),
    _mockFindMany: mockFindMany,
    _mockAlertCreate: mockCreate,
  }
})

import { processBatch } from '../batch-processor'
import { classifyText } from '../classifier'
import * as db from '../db'

function getDbMocks() {
  const mod = db as unknown as {
    _mockFindMany: ReturnType<typeof vi.fn>
    _mockAlertCreate: ReturnType<typeof vi.fn>
  }
  return { findMany: mod._mockFindMany, alertCreate: mod._mockAlertCreate }
}

const MOCK_TEXTS = [
  { id: 'st-001', processedText: 'Texto processado 1', rawText: 'Raw 1' },
  { id: 'st-002', processedText: 'Texto processado 2', rawText: 'Raw 2' },
  { id: 'st-003', processedText: null, rawText: 'Raw sem processedText' },
]

beforeEach(() => {
  vi.clearAllMocks()
  process.env.UPSTASH_REDIS_REST_URL = 'https://mock.upstash.io'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token'
})

describe('processBatch', () => {
  // [SUCCESS] batch com textos válidos — classifica todos
  it('classifica todos os textos do batch e retorna BatchResult', async () => {
    const { findMany } = getDbMocks()
    findMany.mockResolvedValueOnce(MOCK_TEXTS)

    vi.mocked(classifyText)
      .mockResolvedValueOnce({ isPainCandidate: true, scores: {} as never, reasoning: '', suggestedCategory: null })
      .mockResolvedValueOnce({ isPainCandidate: false, scores: {} as never, reasoning: '', suggestedCategory: null })
      .mockResolvedValueOnce({ isPainCandidate: true, scores: {} as never, reasoning: '', suggestedCategory: null })

    const result = await processBatch('batch-001')

    expect(result.batchId).toBe('batch-001')
    expect(result.total).toBe(3)
    expect(result.candidates).toBe(2)
    expect(result.rejected).toBe(1)
    expect(result.errors).toBe(0)
    expect(result.completedAt).toBeTruthy()
  })

  // [EDGE] batch vazio — retorna resultado zerado sem chamar classifyText
  it('retorna resultado zerado para batch sem textos não processados', async () => {
    const { findMany } = getDbMocks()
    findMany.mockResolvedValueOnce([])

    const result = await processBatch('batch-empty')

    expect(result.total).toBe(0)
    expect(result.candidates).toBe(0)
    expect(result.errors).toBe(0)
    expect(classifyText).not.toHaveBeenCalled()
  })

  // [EDGE] item sem processedText e sem rawText — conta como rejected
  it('conta como rejected itens sem texto disponível para classificar', async () => {
    const { findMany } = getDbMocks()
    findMany.mockResolvedValueOnce([
      { id: 'st-null', processedText: null, rawText: null },
    ])

    const result = await processBatch('batch-null')

    expect(result.total).toBe(1)
    expect(result.rejected).toBe(1)
    expect(result.errors).toBe(0)
    expect(classifyText).not.toHaveBeenCalled()
  })

  // [ERROR] classifyText lança exceção — conta como erro, não interrompe batch
  it('conta erros sem interromper processamento dos demais itens', async () => {
    const { findMany } = getDbMocks()
    findMany.mockResolvedValueOnce([
      { id: 'st-err', processedText: 'Texto', rawText: 'Raw' },
      { id: 'st-ok', processedText: 'Texto OK', rawText: 'Raw OK' },
    ])

    vi.mocked(classifyText)
      .mockRejectedValueOnce(new Error('Erro inesperado'))
      .mockResolvedValueOnce({ isPainCandidate: true, scores: {} as never, reasoning: '', suggestedCategory: null })

    const result = await processBatch('batch-err')

    expect(result.total).toBe(2)
    expect(result.errors).toBe(1)
    expect(result.candidates).toBe(1)
  })

  // [SUCCESS] usa processedText quando disponível (preferência sobre rawText)
  it('usa processedText como texto para classificação quando disponível', async () => {
    const { findMany } = getDbMocks()
    findMany.mockResolvedValueOnce([
      { id: 'st-pref', processedText: 'Processed text', rawText: 'Raw text' },
    ])

    vi.mocked(classifyText).mockResolvedValueOnce({
      isPainCandidate: false, scores: {} as never, reasoning: '', suggestedCategory: null,
    })

    await processBatch('batch-pref')

    expect(classifyText).toHaveBeenCalledWith('st-pref', 'Processed text')
  })

  // [SUCCESS] batchId correto é retornado no resultado
  it('retorna o batchId correto no resultado', async () => {
    const { findMany } = getDbMocks()
    findMany.mockResolvedValueOnce([
      { id: 'st-bid', processedText: 'Texto', rawText: 'Raw' },
    ])

    vi.mocked(classifyText).mockResolvedValueOnce({
      isPainCandidate: false, scores: {} as never, reasoning: '', suggestedCategory: null,
    })

    const result = await processBatch('my-batch-id')

    expect(result.batchId).toBe('my-batch-id')
  })
})
