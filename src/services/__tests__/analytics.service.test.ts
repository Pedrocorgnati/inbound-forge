import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AnalyticsService } from '../analytics.service'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lead: { count: vi.fn().mockResolvedValue(0) },
    conversionEvent: { count: vi.fn().mockResolvedValue(0) },
    theme: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))

describe('AnalyticsService', () => {
  let service: AnalyticsService

  beforeEach(() => {
    service = new AnalyticsService()
  })

  describe('getFunnel', () => {
    it('should return funnel data (stub)', async () => {
      const result = await service.getFunnel()
      expect(typeof result.totalLeads).toBe('number')
      expect(typeof result.totalConversions).toBe('number')
    })
  })

  describe('getThemesRanking', () => {
    it('should return array (stub)', async () => {
      const result = await service.getThemesRanking()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('runWeeklyReconciliation', () => {
    it('should throw Not implemented (stub)', async () => {
      await expect(service.runWeeklyReconciliation()).rejects.toThrow('Not implemented')
    })
  })
})
