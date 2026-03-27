/**
 * CX-01: Theme.conversionScore atualizado após ConversionEvent
 * Owner: module-7/TASK-2 | Consumidor: module-13/TASK-3
 * Interface: src/types/theme.ts / prisma Theme.conversionScore
 */
import { describe, it, expect, afterEach } from 'vitest'
import { prisma, createTestTheme, createTestLead, createConversionEvent, cleanupTestData } from './helpers'

afterEach(async () => {
  await cleanupTestData()
})

describe('CX-01: Theme.conversionScore', () => {
  it('atualizado após ConversionEvent MEETING', async () => {
    const theme = await createTestTheme()
    const lead = await createTestLead({ themeId: theme.id })

    const scoreBefore = theme.conversionScore  // 0

    await createConversionEvent({
      leadId: lead.id,
      themeId: theme.id,
      conversionType: 'MEETING',
    })

    const themeAfter = await prisma.theme.findUnique({ where: { id: theme.id } })

    expect(themeAfter).not.toBeNull()
    expect(themeAfter!.conversionScore).toBeGreaterThan(scoreBefore)
  })

  it('múltiplas conversões incrementam o score', async () => {
    const theme = await createTestTheme()
    const lead1 = await createTestLead({ themeId: theme.id })
    const lead2 = await createTestLead({ themeId: theme.id })

    await createConversionEvent({ leadId: lead1.id, themeId: theme.id, conversionType: 'CONVERSATION' })
    await createConversionEvent({ leadId: lead2.id, themeId: theme.id, conversionType: 'MEETING' })

    const themeAfter = await prisma.theme.findUnique({ where: { id: theme.id } })
    expect(themeAfter!.conversionScore).toBeGreaterThanOrEqual(2)
  })

  it('[ERROR] ConversionEvent com themeId inexistente deve rejeitar', async () => {
    const lead = await createTestLead()

    await expect(
      createConversionEvent({
        leadId: lead.id,
        themeId: 'non-existent-uuid-00000000',
        conversionType: 'MEETING',
      })
    ).rejects.toThrow()
  })
})
