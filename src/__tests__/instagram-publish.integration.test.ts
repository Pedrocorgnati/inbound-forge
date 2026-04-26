/**
 * Testes de integração: Instagram publicação e fallback
 * Rastreabilidade: CL-061, CL-063, TASK-3 ST004
 */

import { categorizeError } from '@/lib/instagram/queue-manager'

describe('categorizeError', () => {
  it('should categorize rate limit errors', () => {
    const err = Object.assign(new Error('rate limit'), { code: 'SYS_002' })
    const { category } = categorizeError(err)
    expect(category).toBe('RATE_LIMIT')
  })

  it('should categorize IMAGE_TOO_SMALL errors', () => {
    const err = Object.assign(new Error('IMAGE_TOO_SMALL: imagem menor que 320px'), { code: 'IMG_001' })
    const { category, retryDelayMs } = categorizeError(err)
    expect(category).toBe('IMAGE_TOO_SMALL')
    expect(retryDelayMs).toBeNull() // sem retry automatico
  })

  it('should categorize CAPTION_TOO_LONG errors', () => {
    const err = Object.assign(new Error('CAPTION_TOO_LONG'), { code: 'IMG_002' })
    const { category, retryDelayMs } = categorizeError(err)
    expect(category).toBe('CAPTION_TOO_LONG')
    expect(retryDelayMs).toBeNull()
  })

  it('should categorize token expired errors', () => {
    const err = new Error('token expired')
    const { category } = categorizeError(err)
    expect(category).toBe('TOKEN_EXPIRED')
  })

  it('should fallback to UNKNOWN for unrecognized errors', () => {
    const err = new Error('some random error')
    const { category } = categorizeError(err)
    expect(category).toBe('UNKNOWN')
  })
})

describe('MockInstagramClient', () => {
  it('should upload media and return containerId', async () => {
    const { MockInstagramClient } = await import('@/lib/instagram/instagram-client')
    const client = new MockInstagramClient()
    const result = await client.uploadMedia('https://example.com/img.jpg', 'Test caption')
    expect(result).toHaveProperty('containerId')
    expect(typeof result.containerId).toBe('string')
  })

  it('should check status and return FINISHED', async () => {
    const { MockInstagramClient } = await import('@/lib/instagram/instagram-client')
    const client = new MockInstagramClient()
    const result = await client.checkStatus('mock_container_123')
    expect(result.statusCode).toBe('FINISHED')
  })

  it('should publish post and return instagramPostId', async () => {
    const { MockInstagramClient } = await import('@/lib/instagram/instagram-client')
    const client = new MockInstagramClient()
    const result = await client.publishPost('https://example.com/img.jpg', 'Caption')
    expect(result).toHaveProperty('platformPostId')
    expect(result.publishedAt).toBeInstanceOf(Date)
  })
})
