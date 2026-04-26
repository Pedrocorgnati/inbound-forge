// Intake-Review TASK-9 ST002 (CL-OP-005): smoke test do endpoint /api/health
// Valida que retorna 200 saudavel, 503 em falha, e reconhece header de monitor externo.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    ping: vi.fn(),
  },
}))

import { GET } from '@/app/api/health/route'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/health', { headers })
}

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 200 quando DB e Redis estao ok', async () => {
    ;(prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ '?column?': 1 }])
    ;(redis.ping as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('PONG')

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.db).toBe(true)
    expect(body.redis).toBe(true)
  })

  it('retorna 503 quando DB falha', async () => {
    ;(prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('conn refused'))
    ;(redis.ping as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('PONG')

    const res = await GET(makeRequest())
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.status).toBe('degraded')
    expect(body.db).toBe(false)
  })

  it('reconhece header X-Monitor: betterstack (X-Monitor-Ack presente)', async () => {
    ;(prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ '?column?': 1 }])
    ;(redis.ping as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('PONG')

    const res = await GET(makeRequest({ 'x-monitor': 'betterstack' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('x-monitor-ack')).toBe('1')
  })

  it('reconhece UA Better Uptime Bot (X-Monitor-Ack presente)', async () => {
    ;(prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ '?column?': 1 }])
    ;(redis.ping as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('PONG')

    const res = await GET(makeRequest({ 'user-agent': 'Better Uptime Bot/1.0' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('x-monitor-ack')).toBe('1')
  })

  it('requisicoes normais nao recebem X-Monitor-Ack', async () => {
    ;(prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ '?column?': 1 }])
    ;(redis.ping as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('PONG')

    const res = await GET(makeRequest({ 'user-agent': 'Mozilla/5.0' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('x-monitor-ack')).toBeNull()
  })
})
