/**
 * CX-07: Todos os 15 enums exportados de src/types/enums.ts
 * Owner: module-2/TASK-1 | Consumidores: todos os módulos
 * Interface: src/types/enums.ts
 */
import { describe, it, expect } from 'vitest'
import * as enums from '@/types/enums'

const EXPECTED_ENUMS = [
  'UserRole',
  'EntryStatus',
  'ThemeStatus',
  'ContentAngle',
  'ContentStatus',
  'Channel',
  'WorkerStatus',
  'WorkerType',
  'ConversionType',
  'AttributionType',
  'ArticleStatus',
  'FunnelStage',
  'ImageType',
  'CTADestination',
  'ObjectionType',
] as const

describe('CX-07: 15 enums exportados de enums.ts', () => {
  EXPECTED_ENUMS.forEach((enumName) => {
    it(`${enumName} exportado`, () => {
      expect((enums as Record<string, unknown>)[enumName]).toBeDefined()
    })
  })

  it('Channel contém LINKEDIN, BLOG, INSTAGRAM', () => {
    expect(enums.Channel.LINKEDIN).toBeDefined()
    expect(enums.Channel.BLOG).toBeDefined()
    expect(enums.Channel.INSTAGRAM).toBeDefined()
  })

  it('WorkerType contém SCRAPING, IMAGE, PUBLISHING', () => {
    expect(enums.WorkerType.SCRAPING).toBeDefined()
    expect(enums.WorkerType.IMAGE).toBeDefined()
    expect(enums.WorkerType.PUBLISHING).toBeDefined()
  })

  it('ConversionType contém CONVERSATION, MEETING, PROPOSAL', () => {
    expect(enums.ConversionType.CONVERSATION).toBeDefined()
    expect(enums.ConversionType.MEETING).toBeDefined()
    expect(enums.ConversionType.PROPOSAL).toBeDefined()
  })

  it('ContentStatus contém todos os 7 valores do state machine', () => {
    const expected = ['DRAFT', 'REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'PENDING_ART']
    expected.forEach(val => {
      expect(Object.values(enums.ContentStatus)).toContain(val)
    })
  })
})
