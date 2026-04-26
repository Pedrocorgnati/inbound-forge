/**
 * Unit tests — computeDelta (PublishAuditLog helper)
 * Intake-Review TASK-1 ST006
 */
import { describe, it, expect } from 'vitest'
import { computeDelta } from '@/lib/publishing/delta'

describe('computeDelta', () => {
  it('returns only changed keys', () => {
    const before = { caption: 'old', scheduledAt: new Date('2026-01-01T10:00:00Z'), hashtags: ['#a'] }
    const after = { caption: 'new' }
    const delta = computeDelta(before, after)
    expect(Object.keys(delta)).toEqual(['caption'])
    expect(delta.caption).toEqual({ from: 'old', to: 'new' })
  })

  it('treats equal Date values as unchanged', () => {
    const d1 = new Date('2026-01-01T10:00:00Z')
    const d2 = new Date('2026-01-01T10:00:00Z')
    const delta = computeDelta({ scheduledAt: d1 }, { scheduledAt: d2 })
    expect(delta).toEqual({})
  })

  it('ignores updatedAt/createdAt/id', () => {
    const before = { caption: 'x', updatedAt: new Date(), id: '1' }
    const after = { caption: 'y', updatedAt: new Date(Date.now() + 1000), id: '2' }
    const delta = computeDelta(before, after)
    expect(Object.keys(delta)).toEqual(['caption'])
  })

  it('detects array changes via deep compare', () => {
    const delta = computeDelta({ hashtags: ['#a'] }, { hashtags: ['#a', '#b'] })
    expect(delta.hashtags).toBeDefined()
  })
})
