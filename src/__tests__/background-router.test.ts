// TASK-2 ST002 — backgroundRouter
import { describe, it, expect, afterEach } from 'vitest'
import { selectBackgroundProvider } from '@/lib/image-generation/backgroundRouter'

describe('selectBackgroundProvider', () => {
  afterEach(() => {
    delete process.env.FORCE_PROVIDER
  })

  it('routes to FLUX when needsText=false', () => {
    expect(selectBackgroundProvider({ needsText: false })).toBe('FLUX')
  })

  it('routes to IDEOGRAM when needsText=true', () => {
    expect(selectBackgroundProvider({ needsText: true })).toBe('IDEOGRAM')
  })

  it('honors FORCE_PROVIDER override for tests', () => {
    process.env.FORCE_PROVIDER = 'IDEOGRAM'
    expect(selectBackgroundProvider({ needsText: false })).toBe('IDEOGRAM')
    process.env.FORCE_PROVIDER = 'FLUX'
    expect(selectBackgroundProvider({ needsText: true })).toBe('FLUX')
  })
})
