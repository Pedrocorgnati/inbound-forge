/**
 * Intake-Review TASK-1 ST001/ST004: cobertura unitaria da purga LGPD.
 *
 * Pre-requisitos:
 *   - DATABASE_URL apontando para testdb (Prisma migrate ja aplicado)
 *   - Migration 20260424000001_add_legal_hold_lead_status aplicada
 */
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { purgeExpiredLeads } from '@/lib/services/lgpd-purge.service'

const prisma = new PrismaClient()

async function createThemeAndPostForLead() {
  const theme = await prisma.theme.create({
    data: { title: `test-theme-${Date.now()}`, opportunityScore: 0 },
  })
  const post = await prisma.post.create({
    data: {
      title:       'test',
      slug:        `test-${Date.now()}`,
      contentType: 'ARTICLE',
      themeId:     theme.id,
      status:      'PUBLISHED',
    } as never,
  })
  return { themeId: theme.id, postId: post.id }
}

describe('purgeExpiredLeads', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })
  beforeEach(async () => {
    await prisma.auditLog.deleteMany({ where: { action: 'lgpd.purge' } })
  })

  it('remove leads com createdAt anterior ao cutoff', async () => {
    const { themeId, postId } = await createThemeAndPostForLead()
    const threeYearsAgo = new Date(Date.now() - 3 * 365 * 86400000)
    const lead = await prisma.lead.create({
      data: {
        firstTouchPostId:  postId,
        firstTouchThemeId: themeId,
        status:            'NEW',
        createdAt:         threeYearsAgo,
      } as never,
    })

    const result = await purgeExpiredLeads({ cutoffYears: 2 })

    expect(result.leadsRemoved).toBeGreaterThanOrEqual(1)
    const stillExists = await prisma.lead.findUnique({ where: { id: lead.id } })
    expect(stillExists).toBeNull()
  })

  it('preserva leads em LEGAL_HOLD mesmo se createdAt < cutoff', async () => {
    const { themeId, postId } = await createThemeAndPostForLead()
    const threeYearsAgo = new Date(Date.now() - 3 * 365 * 86400000)
    const held = await prisma.lead.create({
      data: {
        firstTouchPostId:  postId,
        firstTouchThemeId: themeId,
        status:            'LEGAL_HOLD' as never,
        createdAt:         threeYearsAgo,
      } as never,
    })

    await purgeExpiredLeads({ cutoffYears: 2 })

    const stillExists = await prisma.lead.findUnique({ where: { id: held.id } })
    expect(stillExists).not.toBeNull()
  })

  it('purga ScrapedText quando expiresAt no passado', async () => {
    const operator = await prisma.operator.findFirst()
    const source = await prisma.source.findFirst()
    if (!operator || !source) return

    const expired = await prisma.scrapedText.create({
      data: {
        operatorId: operator.id,
        sourceId:   source.id,
        url:        'https://test.example/e1',
        expiresAt:  new Date(Date.now() - 60_000),
      },
    })

    const result = await purgeExpiredLeads()

    expect(result.scrapedTextsRemoved).toBeGreaterThanOrEqual(1)
    const still = await prisma.scrapedText.findUnique({ where: { id: expired.id } })
    expect(still).toBeNull()
  })

  it('grava AuditLog LGPD_PURGE consolidado com contagens quando houve remocoes', async () => {
    const { themeId, postId } = await createThemeAndPostForLead()
    await prisma.lead.create({
      data: {
        firstTouchPostId:  postId,
        firstTouchThemeId: themeId,
        status:            'NEW',
        createdAt:         new Date(Date.now() - 3 * 365 * 86400000),
      } as never,
    })

    await purgeExpiredLeads()

    const log = await prisma.auditLog.findFirst({
      where: { action: 'lgpd.purge' },
      orderBy: { createdAt: 'desc' },
    })
    expect(log).not.toBeNull()
    expect(log?.metadata).toMatchObject({
      leadsRemoved: expect.any(Number),
      cutoffYears:  2,
    })
  })

  it('dryRun calcula contagens sem deletar', async () => {
    const { themeId, postId } = await createThemeAndPostForLead()
    const lead = await prisma.lead.create({
      data: {
        firstTouchPostId:  postId,
        firstTouchThemeId: themeId,
        status:            'NEW',
        createdAt:         new Date(Date.now() - 3 * 365 * 86400000),
      } as never,
    })

    const result = await purgeExpiredLeads({ dryRun: true })
    expect(result.dryRun).toBe(true)
    expect(result.leadsRemoved).toBeGreaterThanOrEqual(1)

    const still = await prisma.lead.findUnique({ where: { id: lead.id } })
    expect(still).not.toBeNull()

    await prisma.lead.delete({ where: { id: lead.id } })
  })
})
