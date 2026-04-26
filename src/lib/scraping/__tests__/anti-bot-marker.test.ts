/**
 * TASK-3 ST002 — TDD anti-bot marker (threshold + reset)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const sourceStore = new Map<string, {
  id: string
  operatorId: string
  antiBotBlocked: boolean
  antiBotReason: string | null
  antiBotBlockedAt: Date | null
  consecutiveFailures: number
}>()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    source: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const s = sourceStore.get(where.id)
        return s ? { consecutiveFailures: s.consecutiveFailures, antiBotBlocked: s.antiBotBlocked } : null
      }),
      findFirst: vi.fn(async ({ where }: { where: { id: string; operatorId: string } }) => {
        const s = sourceStore.get(where.id)
        if (!s || s.operatorId !== where.operatorId) return null
        return { id: s.id }
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const s = sourceStore.get(where.id)
        if (!s) throw new Error('not found')
        Object.assign(s, data)
        return s
      }),
    },
  },
}))

import { recordScrapeOutcome, resetAntiBotProtection } from '../anti-bot-marker'
import { ANTI_BOT_FAILURE_THRESHOLD } from '../anti-bot-detector'

function seed(id: string) {
  sourceStore.set(id, {
    id,
    operatorId: 'op-1',
    antiBotBlocked: false,
    antiBotReason: null,
    antiBotBlockedAt: null,
    consecutiveFailures: 0,
  })
}

describe('recordScrapeOutcome', () => {
  beforeEach(() => { sourceStore.clear() })

  it('zera contador em sucesso', async () => {
    seed('s1')
    sourceStore.get('s1')!.consecutiveFailures = 2
    const r = await recordScrapeOutcome({
      sourceId: 's1',
      succeeded: true,
      response: { status: 200 },
    })
    expect(r.isBlocked).toBe(false)
    expect(sourceStore.get('s1')!.consecutiveFailures).toBe(0)
  })

  it(`marca antiBotBlocked apos ${ANTI_BOT_FAILURE_THRESHOLD} falhas consecutivas`, async () => {
    seed('s2')
    for (let i = 0; i < ANTI_BOT_FAILURE_THRESHOLD; i++) {
      await recordScrapeOutcome({
        sourceId: 's2',
        succeeded: false,
        response: { status: 403 },
      })
    }
    const s = sourceStore.get('s2')!
    expect(s.antiBotBlocked).toBe(true)
    expect(s.consecutiveFailures).toBe(ANTI_BOT_FAILURE_THRESHOLD)
    expect(s.antiBotBlockedAt).toBeInstanceOf(Date)
  })

  it('nao marca se falha nao tem sinal anti-bot (ex: 500)', async () => {
    seed('s3')
    for (let i = 0; i < ANTI_BOT_FAILURE_THRESHOLD; i++) {
      await recordScrapeOutcome({
        sourceId: 's3',
        succeeded: false,
        response: { status: 500 },
      })
    }
    expect(sourceStore.get('s3')!.antiBotBlocked).toBe(false)
  })
})

describe('resetAntiBotProtection', () => {
  beforeEach(() => { sourceStore.clear() })

  it('zera flag + contador quando operador dono existe', async () => {
    seed('s4')
    const s = sourceStore.get('s4')!
    s.antiBotBlocked = true
    s.antiBotReason = 'HTTP 403'
    s.antiBotBlockedAt = new Date()
    s.consecutiveFailures = 3

    const r = await resetAntiBotProtection('s4', 'op-1')
    expect(r.ok).toBe(true)
    expect(sourceStore.get('s4')!.antiBotBlocked).toBe(false)
    expect(sourceStore.get('s4')!.consecutiveFailures).toBe(0)
    expect(sourceStore.get('s4')!.antiBotReason).toBeNull()
  })

  it('retorna NOT_FOUND se fonte nao pertence ao operador', async () => {
    seed('s5')
    const r = await resetAntiBotProtection('s5', 'op-other')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('NOT_FOUND')
  })
})
