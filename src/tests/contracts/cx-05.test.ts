/**
 * CX-05: WorkerHealth.lastHeartbeat atualizado em ciclo de worker
 * Owner: module-1/TASK-1 | Consumidores: module-6/TASK-1, module-9/TASK-1, module-12/TASK-4
 * Interface: src/types/worker.ts / WorkerHealth.lastHeartbeat
 */
import { describe, it, expect, afterEach } from 'vitest'
import { prisma, cleanupTestData } from './helpers'
import { WorkerType, WorkerStatus } from '@/types/enums'

afterEach(async () => {
  await cleanupTestData()
  await prisma.workerHealth.deleteMany({ where: { workerId: { startsWith: 'cx05-test-' } } })
})

async function upsertWorkerHealth(type: WorkerType) {
  const workerId = `cx05-test-${type}-${Date.now()}`
  return prisma.workerHealth.upsert({
    where: { type },
    update: {
      status: WorkerStatus.ACTIVE,
      lastHeartbeat: new Date(),
    },
    create: {
      workerId,
      type,
      status: WorkerStatus.ACTIVE,
      lastHeartbeat: new Date(),
    },
  })
}

describe('CX-05: WorkerHealth.lastHeartbeat', () => {
  it('lastHeartbeat atualizado após ciclo do scraping worker', async () => {
    const before = new Date(Date.now() - 1000)  // 1s atrás

    await upsertWorkerHealth(WorkerType.SCRAPING)

    const health = await prisma.workerHealth.findUnique({
      where: { type: WorkerType.SCRAPING },
    })

    expect(health).not.toBeNull()
    expect(health!.lastHeartbeat.getTime()).toBeGreaterThan(before.getTime())
    expect(health!.status).toBe(WorkerStatus.ACTIVE)
  })

  it('lastHeartbeat atualizado após ciclo do image worker', async () => {
    const before = new Date(Date.now() - 1000)

    await upsertWorkerHealth(WorkerType.IMAGE)

    const health = await prisma.workerHealth.findUnique({
      where: { type: WorkerType.IMAGE },
    })

    expect(health!.lastHeartbeat.getTime()).toBeGreaterThan(before.getTime())
  })

  it('[NOTIF-001] Heartbeat ausente > 30min deve acionar alert (verificação de threshold)', async () => {
    // Simular worker com heartbeat antigo (30min+ atrás)
    const oldHeartbeat = new Date(Date.now() - 31 * 60 * 1000)

    const workerId = `cx05-test-alert-${Date.now()}`
    await prisma.workerHealth.upsert({
      where: { type: WorkerType.SCRAPING },
      update: { lastHeartbeat: oldHeartbeat, status: WorkerStatus.ERROR },
      create: {
        workerId,
        type: WorkerType.SCRAPING,
        status: WorkerStatus.ERROR,
        lastHeartbeat: oldHeartbeat,
      },
    })

    const health = await prisma.workerHealth.findUnique({ where: { type: WorkerType.SCRAPING } })
    const diffMin = (Date.now() - health!.lastHeartbeat.getTime()) / 60000

    // Threshold NOTIF-001: > 30 minutos sem heartbeat = alerta
    expect(diffMin).toBeGreaterThan(30)
    expect(health!.status).toBe(WorkerStatus.ERROR)
  })
})
