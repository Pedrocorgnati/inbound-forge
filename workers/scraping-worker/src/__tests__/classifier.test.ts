/**
 * Tests: Claude Classifier
 * TASK-2 ST001 + ST004 / module-6-scraping-worker
 * Cobertura: SUCCESS, ERROR, EDGE, DEGRADED
 *
 * Anthropic SDK e Prisma são mockados para isolar lógica do classificador.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn()
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
    _mockCreate: mockCreate,
  }
})

// Mock do Prisma (db)
vi.mock('../db', () => {
  const mockUpsert = vi.fn().mockResolvedValue({})
  const mockCreate = vi.fn().mockResolvedValue({})
  const mockUpdate = vi.fn().mockResolvedValue({})

  return {
    getPrisma: vi.fn().mockReturnValue({
      alertLog: { create: mockCreate },
      scrapedText: { update: mockUpdate },
      apiUsageLog: { create: mockCreate },
    }),
    _mockUpdate: mockUpdate,
    _mockAlertCreate: mockCreate,
  }
})

import { classifyText } from '../classifier'
import Anthropic from '@anthropic-ai/sdk'
import * as db from '../db'

function getMockCreate() {
  const mod = Anthropic as unknown as { _mockCreate: ReturnType<typeof vi.fn> }
  return mod._mockCreate
}

function getDbMocks() {
  const mod = db as unknown as {
    _mockUpdate: ReturnType<typeof vi.fn>
    _mockAlertCreate: ReturnType<typeof vi.fn>
  }
  return { update: mod._mockUpdate, alertCreate: mod._mockAlertCreate }
}

const VALID_CLAUDE_RESPONSE = {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        isPainCandidate: true,
        scores: {
          isOperationalPain: 'sim',
          isSolvableWithSoftware: 'sim',
          involvesIntegration: 'sim',
          companySize: 'media',
          isRecurrent: 'sim',
        },
        reasoning: 'Empresa relata dificuldade de integração entre sistemas legados.',
        suggestedCategory: 'integracao',
      }),
    },
  ],
  usage: { input_tokens: 150, output_tokens: 80 },
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.ANTHROPIC_API_KEY
  // Reset singleton client
  vi.resetModules()
})

describe('classifyText', () => {
  // [SUCCESS] classificação válida com isPainCandidate=true
  it('retorna resultado com isPainCandidate=true quando Claude responde corretamente', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-valid'
    getMockCreate().mockResolvedValueOnce(VALID_CLAUDE_RESPONSE)

    const result = await classifyText('id-001', 'Precisamos integrar ERP com CRM urgente.')

    expect(result.isPainCandidate).toBe(true)
    expect(result.scores.isOperationalPain).toBe('sim')
    expect(result.scores.isSolvableWithSoftware).toBe('sim')
  })

  // [SUCCESS] isPainCandidate é false quando scores não atendem critério
  it('retorna isPainCandidate=false quando isOperationalPain != sim', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-valid'
    const responseWithFalse = {
      ...VALID_CLAUDE_RESPONSE,
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            isPainCandidate: true, // Claude retornou true mas lógica força false
            scores: {
              isOperationalPain: 'nao',
              isSolvableWithSoftware: 'sim',
              involvesIntegration: 'nao',
              companySize: 'pequena',
              isRecurrent: 'nao',
            },
            reasoning: 'Não há dor operacional identificada.',
            suggestedCategory: null,
          }),
        },
      ],
    }
    getMockCreate().mockResolvedValueOnce(responseWithFalse)

    const result = await classifyText('id-002', 'Texto sem dor operacional.')

    // Lógica interna: isPainCandidate = isOperationalPain===sim && isSolvableWithSoftware===sim
    expect(result.isPainCandidate).toBe(false)
  })

  // [ST004] PII no reasoning é redactado antes de persistir
  it('redacta CPF no reasoning antes de persistir (ST004 anti-PII)', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-valid'
    const responseWithPiiInReasoning = {
      ...VALID_CLAUDE_RESPONSE,
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            isPainCandidate: true,
            scores: {
              isOperationalPain: 'sim',
              isSolvableWithSoftware: 'sim',
              involvesIntegration: 'nao',
              companySize: 'media',
              isRecurrent: 'sim',
            },
            reasoning: 'CPF do solicitante é 123.456.789-09, empresa Acme.',
            suggestedCategory: 'lgpd',
          }),
        },
      ],
    }
    getMockCreate().mockResolvedValueOnce(responseWithPiiInReasoning)

    const result = await classifyText('id-003', 'Texto com PII no reasoning.')

    expect(result.reasoning).toBe('[REDACTED - PII detectado]')
    expect(result.reasoning).not.toContain('123.456.789-09')
  })

  // [DEGRADED] sem ANTHROPIC_API_KEY — retorna fallback imediato
  it('retorna FALLBACK_RESULT quando ANTHROPIC_API_KEY não está configurada', async () => {
    // API key não definida
    const result = await classifyText('id-004', 'Qualquer texto.')

    expect(result.isPainCandidate).toBe(false)
    expect(result.reasoning).toContain('Erro de classificação')
    expect(getMockCreate()).not.toHaveBeenCalled()
  })

  // [ERROR] resposta não é JSON válido — retorna fallback de parse
  it('retorna resultado com reasoning de erro quando Claude retorna JSON inválido', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-valid'
    getMockCreate().mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Isso não é JSON válido' }],
      usage: { input_tokens: 10, output_tokens: 5 },
    })

    const result = await classifyText('id-005', 'Texto qualquer.')

    expect(result.isPainCandidate).toBe(false)
    expect(result.reasoning).toContain('Erro de parse')
  })

  // [DEGRADED] erro 401 (auth) — não retenta, retorna fallback
  it('não retenta após erro de autenticação 401', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-invalid'
    getMockCreate().mockRejectedValue(new Error('401 Unauthorized — invalid auth token'))

    const result = await classifyText('id-006', 'Texto qualquer.')

    expect(result.isPainCandidate).toBe(false)
    // Chamou apenas 1 vez (sem retry)
    expect(getMockCreate()).toHaveBeenCalledTimes(1)
  })

  // [ERROR] 3 falhas consecutivas — retorna fallback e loga AlertLog
  it('retorna fallback após 3 tentativas com falha genérica', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-valid'
    getMockCreate().mockRejectedValue(new Error('Network error'))

    const result = await classifyText('id-007', 'Texto qualquer.')

    expect(result.isPainCandidate).toBe(false)
    expect(getMockCreate()).toHaveBeenCalledTimes(3)
  })
})
