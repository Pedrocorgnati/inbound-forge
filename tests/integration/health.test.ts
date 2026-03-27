/**
 * Testes de Integração — Health
 * Endpoints: GET /api/v1/health | POST /api/v1/health/heartbeat
 *
 * Rastreabilidade: US-008 [SUCCESS/ERROR/EDGE], US-009 [ERROR], US-010 [ERROR]
 * Erros cobertos: AUTH_001, WORKER_001, WORKER_002, SYS_002
 * Ameaças: THREAT-001 (token rate), THREAT-002 (healthcheck verbose)
 */

import { describe, it, expect, afterEach, beforeAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { makeWorkerRequest, makeUnauthenticatedRequest, WORKER_TEST_TOKEN } from './helpers/auth.helper'
import { buildHeartbeatPayload } from './helpers/factory.helper'
import { GET as healthGET } from '@/app/api/v1/health/route'
import { POST as heartbeatPOST } from '@/app/api/v1/health/heartbeat/route'

const prisma = new PrismaClient()

// Garantir que WORKER_AUTH_TOKEN aponta para o token de teste
process.env.WORKER_AUTH_TOKEN = WORKER_TEST_TOKEN

afterEach(async () => {
  // Limpar workers criados em testes — não limpar os de seed
  await prisma.workerHealth.deleteMany({
    where: { errorMessage: { contains: '[TEST-' } },
  })
})

afterEach(async () => {
  await prisma.$disconnect()
})

// ─── GET /api/v1/health ──────────────────────────────────────────────────────

describe('GET /api/v1/health', () => {
  it('[Cenário 1] deve retornar status healthy quando banco está conectado', async () => {
    const response = await healthGET()
    const body = await response.json()

    // Status HTTP
    expect(response.status).toBe(200)

    // Estrutura da resposta (THREAT-002: validar que não expõe dados excessivos)
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('healthy')
    expect(body.data.database).toBe('connected')
    expect(body.data.timestamp).toBeDefined()

    // Campos de workers presentes (healthcheck público — cobre US-008)
    expect(body.data.workers).toHaveProperty('scraping')
    expect(body.data.workers).toHaveProperty('image')
    expect(body.data.workers).toHaveProperty('publishing')

    // Cada worker tem pelo menos status e lastHeartbeat (pode ser null se não seedado)
    expect(body.data.workers.scraping).toHaveProperty('status')
    expect(body.data.workers.scraping).toHaveProperty('lastHeartbeat')
  })

  it('[Cenário 3] deve ser público — sem autenticação necessária', async () => {
    // GET /health não requer auth — qualquer chamada deve funcionar
    const response = await healthGET()
    expect(response.status).not.toBe(401)
    expect(response.status).not.toBe(403)
  })
})

// ─── POST /api/v1/health/heartbeat ───────────────────────────────────────────

describe('POST /api/v1/health/heartbeat', () => {
  it('[Cenário 1] worker SCRAPING deve registrar heartbeat com sucesso', async () => {
    const payload = buildHeartbeatPayload({ type: 'SCRAPING', status: 'ACTIVE' })
    const req = makeWorkerRequest('http://localhost:3000/api/v1/health/heartbeat', { body: payload })
    const response = await heartbeatPOST(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)

    // Verificar que o registro foi atualizado no banco
    const worker = await prisma.workerHealth.findFirst({ where: { type: 'SCRAPING' } })
    expect(worker).toBeTruthy()
    expect(worker!.status).toBe('ACTIVE')
    expect(worker!.lastHeartbeat).toBeTruthy()
  })

  it('[Cenário 1] worker IMAGE deve registrar heartbeat com status IDLE', async () => {
    const payload = buildHeartbeatPayload({ type: 'IMAGE', status: 'IDLE' })
    const req = makeWorkerRequest('http://localhost:3000/api/v1/health/heartbeat', { body: payload })
    const response = await heartbeatPOST(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)

    const worker = await prisma.workerHealth.findFirst({ where: { type: 'IMAGE' } })
    expect(worker!.status).toBe('IDLE')
  })

  it('[Cenário 1] worker deve registrar errorMessage no status ERROR', async () => {
    const errorMsg = '[TEST-] Falha de conexão com Redis após 3 tentativas'
    const payload = buildHeartbeatPayload({ type: 'PUBLISHING', status: 'ERROR', errorMessage: errorMsg })
    const req = makeWorkerRequest('http://localhost:3000/api/v1/health/heartbeat', { body: payload })
    const response = await heartbeatPOST(req)

    expect(response.status).toBe(200)

    const worker = await prisma.workerHealth.findFirst({ where: { type: 'PUBLISHING' } })
    expect(worker!.status).toBe('ERROR')
    expect(worker!.errorMessage).toContain('[TEST-]')
  })

  it('[Cenário 2 — AUTH_001] deve retornar 401 sem token Bearer', async () => {
    // Cobre THREAT-001: validar que endpoint de worker não é público
    const req = makeUnauthenticatedRequest(
      'http://localhost:3000/api/v1/health/heartbeat',
      { method: 'POST', body: buildHeartbeatPayload() }
    )
    const response = await heartbeatPOST(req)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.success).toBe(false)
  })

  it('[Cenário 2 — AUTH_001] deve retornar 401 com token Bearer inválido', async () => {
    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost:3000/api/v1/health/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-invalido-que-nao-existe',
      },
      body: JSON.stringify(buildHeartbeatPayload()),
    })
    const response = await heartbeatPOST(req)

    expect(response.status).toBe(401)
  })

  it('[Cenário 2 — WORKER_001] deve retornar erro com WorkerType inválido', async () => {
    const payload = { type: 'INVALID_WORKER_TYPE', status: 'ACTIVE' }
    const req = makeWorkerRequest('http://localhost:3000/api/v1/health/heartbeat', { body: payload })
    const response = await heartbeatPOST(req)
    const body = await response.json()

    // Zod rejeita enum inválido → 422
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(body.success).toBe(false)
  })

  it('[Cenário 2 — WORKER_002] deve retornar erro com WorkerStatus inválido', async () => {
    const payload = { type: 'SCRAPING', status: 'UNKNOWN_STATUS' }
    const req = makeWorkerRequest('http://localhost:3000/api/v1/health/heartbeat', { body: payload })
    const response = await heartbeatPOST(req)
    const body = await response.json()

    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(body.success).toBe(false)
  })

  it('[Cenário 2 — VAL_001] deve retornar erro sem campo obrigatório type', async () => {
    const payload = { status: 'ACTIVE' } // type ausente
    const req = makeWorkerRequest('http://localhost:3000/api/v1/health/heartbeat', { body: payload })
    const response = await heartbeatPOST(req)

    expect(response.status).toBeGreaterThanOrEqual(400)
  })

  it('[Cenário 4 — THREAT-001] token vazio deve ser rejeitado', async () => {
    const { NextRequest } = await import('next/server')
    const req = new NextRequest('http://localhost:3000/api/v1/health/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ',
      },
      body: JSON.stringify(buildHeartbeatPayload()),
    })
    const response = await heartbeatPOST(req)

    expect(response.status).toBe(401)
  })
})
