/**
 * Testes de Integração — First-Touch Attribution Imutável (TST-011 / RN-012)
 *
 * Regras de negócio:
 *   RN-012: firstTouchThemeId é imutável após primeiro set no Lead
 *   RN-013: assistedTouch pode mudar (conversionEvent.attribution = ASSISTED_TOUCH)
 *
 * Cobre: POST /api/v1/conversions
 * Rastreabilidade: TASK-7/ST005
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { mockSessionAuthenticated } from './helpers/auth.helper'

vi.mock('@/lib/api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-auth')>()
  return {
    ...actual,
    requireSession: vi.fn().mockResolvedValue(mockSessionAuthenticated),
  }
})

const THEME_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const THEME_B_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const LEAD_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const POST_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

const baseLead = {
  id: LEAD_ID,
  company: 'Acme Corp',
  channel: 'BLOG' as const,
  funnelStage: 'AWARENESS',
  firstTouchThemeId: THEME_A_ID,
  firstTouchPostId: POST_ID,
  contactInfo: null,
  lgpdConsent: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

const prismaMock = {
  lead: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  conversionEvent: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/conversion-score', () => ({
  updateThemeConversionScore: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/audit', () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
}))

const { POST: conversionsPOST } = await import('@/app/api/v1/conversions/route')

function makeConversionRequest(
  leadId: string,
  attribution: 'FIRST_TOUCH' | 'ASSISTED_TOUCH' = 'FIRST_TOUCH',
  type: 'CONVERSATION' | 'MEETING' | 'PROPOSAL' = 'CONVERSATION'
): NextRequest {
  return new NextRequest(
    new URL('http://localhost:3000/api/v1/conversions'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId,
        type,
        attribution,
        occurredAt: new Date().toISOString(),
      }),
    }
  )
}

describe('First-Touch Attribution Imutável (TST-011 / RN-012)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.lead.findUnique.mockResolvedValue(baseLead)
    prismaMock.conversionEvent.create.mockImplementation(async ({ data }) => ({
      id: `conv-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  })

  // ─── RN-012: First-touch imutável ────────────────────────────────────────

  it('[SUCCESS] primeira conversão cria ConversionEvent vinculado ao firstTouchThemeId', async () => {
    const req = makeConversionRequest(LEAD_ID)
    const response = await conversionsPOST(req)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.data.leadId).toBe(LEAD_ID)
    expect(body.data.attribution).toBe('FIRST_TOUCH')
  })

  it('[EDGE] segunda conversão NÃO altera firstTouchThemeId do lead (RN-012)', async () => {
    // Primeira conversão
    await conversionsPOST(makeConversionRequest(LEAD_ID, 'FIRST_TOUCH'))
    // Segunda conversão (mesmo lead)
    const response = await conversionsPOST(makeConversionRequest(LEAD_ID, 'FIRST_TOUCH'))

    expect(response.status).toBe(201)
    // Lead.update NUNCA deve ser chamado — firstTouchThemeId é imutável
    expect(prismaMock.lead.update).not.toHaveBeenCalled()
  })

  it('[EDGE] N conversões consecutivas: firstTouchThemeId permanece THEME_A_ID', async () => {
    // 3 conversões do mesmo lead
    await conversionsPOST(makeConversionRequest(LEAD_ID, 'FIRST_TOUCH', 'CONVERSATION'))
    await conversionsPOST(makeConversionRequest(LEAD_ID, 'FIRST_TOUCH', 'MEETING'))
    await conversionsPOST(makeConversionRequest(LEAD_ID, 'FIRST_TOUCH', 'PROPOSAL'))

    // Lead nunca foi atualizado (firstTouchThemeId imutável)
    expect(prismaMock.lead.update).not.toHaveBeenCalled()

    // O updateThemeConversionScore sempre usa o firstTouchThemeId original
    const { updateThemeConversionScore } = await import('@/lib/conversion-score')
    const calls = vi.mocked(updateThemeConversionScore).mock.calls
    expect(calls).toHaveLength(3)
    calls.forEach((call) => {
      expect(call[0]).toBe(THEME_A_ID)  // sempre THEME_A, nunca outro theme
    })
  })

  // ─── RN-013: Assisted touch ──────────────────────────────────────────────

  it('[SUCCESS] assisted touch pode gerar conversão com attribution ASSISTED_TOUCH (RN-013)', async () => {
    const req = makeConversionRequest(LEAD_ID, 'ASSISTED_TOUCH')
    const response = await conversionsPOST(req)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.data.attribution).toBe('ASSISTED_TOUCH')

    // Mesmo para assisted touch, firstTouchThemeId do lead não muda
    expect(prismaMock.lead.update).not.toHaveBeenCalled()
  })

  it('[SUCCESS] assisted touch usa o mesmo firstTouchThemeId para scoring', async () => {
    const req = makeConversionRequest(LEAD_ID, 'ASSISTED_TOUCH')
    await conversionsPOST(req)

    const { updateThemeConversionScore } = await import('@/lib/conversion-score')
    // Score é calculado com base no firstTouchThemeId do lead (THEME_A_ID)
    expect(vi.mocked(updateThemeConversionScore)).toHaveBeenCalledWith(THEME_A_ID)
  })

  // ─── Erro/Validação ──────────────────────────────────────────────────────

  it('[ERROR] conversão para lead inexistente → 404', async () => {
    prismaMock.lead.findUnique.mockResolvedValue(null)

    const req = makeConversionRequest('ffffffff-ffff-ffff-ffff-ffffffffffff')
    const response = await conversionsPOST(req)

    expect(response.status).toBe(404)
  })

  it('[ERROR] payload inválido (leadId não é UUID) → 422', async () => {
    const req = new NextRequest(
      new URL('http://localhost:3000/api/v1/conversions'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: 'not-a-uuid',
          type: 'CONVERSATION',
          attribution: 'FIRST_TOUCH',
          occurredAt: new Date().toISOString(),
        }),
      }
    )
    const response = await conversionsPOST(req)

    expect(response.status).toBe(422)
  })
})
