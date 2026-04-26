/**
 * Unit tests — adaptForChannel
 * Intake-Review TASK-1 ST003 (CL-226)
 */
import { describe, it, expect } from 'vitest'
import { adaptForChannel } from '@/lib/publishing/adaptForChannel'

describe('adaptForChannel', () => {
  const baseLinkedIn = {
    caption: 'a'.repeat(2800),
    hashtags: ['#a', '#b', '#c', '#d', '#e', '#f', '#g'],
    ctaText: 'Saiba mais',
    ctaUrl: 'https://ex.com',
    sourceChannel: 'LINKEDIN' as const,
  }

  it('adapts LinkedIn to Instagram: truncates caption to 2200 and hashtags to 30', () => {
    const longHashtags = Array.from({ length: 50 }, (_, i) => `#h${i}`)
    const result = adaptForChannel(
      { ...baseLinkedIn, hashtags: longHashtags },
      'INSTAGRAM',
    )
    expect(result.caption.length).toBeLessThanOrEqual(2200)
    expect(result.hashtags.length).toBeLessThanOrEqual(30)
  })

  it('adapts Instagram to LinkedIn: trims hashtags to 5', () => {
    const result = adaptForChannel(
      {
        caption: 'short caption',
        hashtags: ['#a', '#b', '#c', '#d', '#e', '#f', '#g'],
        ctaText: '',
        ctaUrl: null,
        sourceChannel: 'INSTAGRAM',
      },
      'LINKEDIN',
    )
    expect(result.hashtags).toHaveLength(5)
    expect(result.ctaText).toBe('Saiba mais nos comentarios')
  })

  it('returns identical content when source and target are equal', () => {
    const result = adaptForChannel(baseLinkedIn, 'LINKEDIN')
    expect(result.caption).toBe(baseLinkedIn.caption)
    expect(result.hashtags).toEqual(baseLinkedIn.hashtags)
  })

  it('uses channel default CTA when source has none', () => {
    const result = adaptForChannel(
      {
        caption: 'x',
        hashtags: [],
        ctaText: null,
        ctaUrl: null,
        sourceChannel: 'BLOG',
      },
      'INSTAGRAM',
    )
    expect(result.ctaText).toBe('Link na bio')
  })
})
