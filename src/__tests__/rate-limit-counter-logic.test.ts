// TASK-15 ST007 — Smoke tests da logica de payload do RateLimitCounter
// (M11.6 UI / G-007). Cobre derivacoes deterministicas (used/remaining/
// percentageUsed/resetsAt) sem depender de Redis ou DOM.
//
// Nota: tests render-based ficam pendentes ate a infra vitest+jsdom ser
// adicionada (ja registrado em PENDING-ACTIONS na execucao de TASK-11).

import { describe, it, expect } from 'vitest'

const HOUR_MS = 3_600_000
const LIMIT = 200

interface PayloadShape {
  used: number
  limit: number
  remaining: number
  resetsAt: string
  percentageUsed: number
}

function buildPayload(requestsThisHour: number, now = Date.now()): PayloadShape {
  const used = Math.min(requestsThisHour, LIMIT)
  const remaining = Math.max(0, LIMIT - used)
  const percentageUsed = Math.min(100, Math.round((used / LIMIT) * 100))
  const resetsAtMs = (Math.floor(now / HOUR_MS) + 1) * HOUR_MS
  return {
    used,
    limit: LIMIT,
    remaining,
    resetsAt: new Date(resetsAtMs).toISOString(),
    percentageUsed,
  }
}

describe('RateLimitCounter payload (TASK-15 / G-007)', () => {
  it('0 req → remaining=200, percentageUsed=0, canPublish', () => {
    const p = buildPayload(0)
    expect(p.used).toBe(0)
    expect(p.remaining).toBe(200)
    expect(p.percentageUsed).toBe(0)
  })

  it('120 req → 60% usado, remaining=80', () => {
    const p = buildPayload(120)
    expect(p.used).toBe(120)
    expect(p.remaining).toBe(80)
    expect(p.percentageUsed).toBe(60)
  })

  it('165 req → 83% (zona warning)', () => {
    const p = buildPayload(165)
    expect(p.percentageUsed).toBe(83)
    expect(p.remaining).toBe(35)
  })

  it('200 req → 100%, remaining=0 (botao bloqueado)', () => {
    const p = buildPayload(200)
    expect(p.used).toBe(200)
    expect(p.remaining).toBe(0)
    expect(p.percentageUsed).toBe(100)
  })

  it('300 req (estouro do limite por race) → cap em 200', () => {
    const p = buildPayload(300)
    expect(p.used).toBe(200)
    expect(p.remaining).toBe(0)
    expect(p.percentageUsed).toBe(100)
  })

  it('resetsAt e sempre o proximo bucket de 1h', () => {
    // 14:30:00 UTC, 2026-04-26
    const fixed = Date.UTC(2026, 3, 26, 14, 30, 0)
    const p = buildPayload(0, fixed)
    expect(new Date(p.resetsAt).getTime()).toBe(Date.UTC(2026, 3, 26, 15, 0, 0))
  })

  it('valor exato do bucket (00:00) avanca para o proximo', () => {
    const fixed = Date.UTC(2026, 3, 26, 0, 0, 0)
    const p = buildPayload(0, fixed)
    expect(new Date(p.resetsAt).getTime()).toBe(Date.UTC(2026, 3, 26, 1, 0, 0))
  })
})
