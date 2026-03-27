// module-9: TASK-3 — Provider tests (mocked, no real API calls)
// Rastreabilidade: TASK-3 ST001 ST002, FEAT-creative-generation-003

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { selectProvider, generateBackground }    from '../providers/index'

// ── selectProvider ────────────────────────────────────────────────────────────

describe('selectProvider', () => {
  it('returns ideogram for text-heavy templates', () => {
    expect(selectProvider('ERROR_CARD')).toBe('ideogram')
    expect(selectProvider('SOLUTION_CARD')).toBe('ideogram')
    expect(selectProvider('BEFORE_AFTER')).toBe('ideogram')
    expect(selectProvider('BACKSTAGE_CARD')).toBe('ideogram')
  })

  it('returns flux for visual templates', () => {
    expect(selectProvider('CAROUSEL')).toBe('flux')
    expect(selectProvider('STATIC_LANDSCAPE')).toBe('flux')
    expect(selectProvider('STATIC_PORTRAIT')).toBe('flux')
    expect(selectProvider('VIDEO_COVER')).toBe('flux')
  })
})

// ── generateBackground ─────────────────────────────────────────────────────────

describe('generateBackground', () => {
  const dims = { widthPx: 1080, heightPx: 1080 }
  const env  = { IDEOGRAM_API_KEY: 'test-ideogram', FAL_API_KEY: 'test-fal' }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns Buffer from primary provider (ideogram path)', async () => {
    const mockImageUrl = 'https://cdn.example.com/image.png'
    const mockBuffer   = Buffer.from('fake-image-data')

    // Mock fetch: ideogram API response + image download
    let callCount = 0
    vi.stubGlobal('fetch', async (url: string) => {
      callCount++
      if (url.includes('ideogram')) {
        return {
          ok:   true,
          json: async () => ({ data: [{ url: mockImageUrl }] }),
        }
      }
      // download call
      return {
        ok:          true,
        arrayBuffer: async () => mockBuffer.buffer,
      }
    })

    const result = await generateBackground('ERROR_CARD', 'test prompt', dims, env)
    expect(result).toBeInstanceOf(Buffer)
    expect(result.length).toBeGreaterThan(0)
    expect(callCount).toBe(2) // 1 API call + 1 download
  })

  it('falls back to secondary provider when primary fails', async () => {
    let callCount = 0
    vi.stubGlobal('fetch', async (url: string) => {
      callCount++
      if (url.includes('ideogram')) {
        return { ok: false, status: 500, text: async () => 'Server Error' }
      }
      // Fal.ai download
      return {
        ok:          true,
        arrayBuffer: async () => Buffer.from('fallback-data').buffer,
      }
    })

    // Mock fal.run
    vi.mock('@fal-ai/serverless-client', () => ({
      config: vi.fn(),
      run:    vi.fn().mockResolvedValue({ images: [{ url: 'https://cdn.fal.ai/img.png' }] }),
    }))

    const result = await generateBackground('ERROR_CARD', 'test prompt', dims, env)
    expect(result).toBeInstanceOf(Buffer)
  })

  it('returns static Buffer when all AI providers fail', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: false, status: 500, text: async () => 'Error',
    }))

    vi.mock('@fal-ai/serverless-client', () => ({
      config: vi.fn(),
      run:    vi.fn().mockRejectedValue(new Error('fal error')),
    }))

    const result = await generateBackground('ERROR_CARD', 'test prompt', dims, env)
    expect(result).toBeInstanceOf(Buffer)
    expect(result.length).toBeGreaterThan(0)
  })

  it('re-throws AbortError without fallback', async () => {
    const controller = new AbortController()
    controller.abort()

    vi.stubGlobal('fetch', async (_url: string, opts?: RequestInit) => {
      if (opts?.signal?.aborted) {
        const err = new Error('Aborted')
        err.name  = 'AbortError'
        throw err
      }
      return { ok: true, json: async () => ({ data: [{ url: 'https://x.com' }] }) }
    })

    await expect(
      generateBackground('ERROR_CARD', 'prompt', dims, env, controller.signal)
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})
