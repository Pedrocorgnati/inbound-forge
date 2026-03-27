// module-10: Thumbnail Service — Unit Tests
// Rastreabilidade: TASK-1 ST004, INT-063

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockToBuffer    = vi.fn()
const mockWebp        = vi.fn(() => ({ toBuffer: mockToBuffer }))
const mockResize      = vi.fn(() => ({ webp: mockWebp }))

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize: mockResize,
  })),
}))

vi.mock('@/lib/constants/asset-library', () => ({
  ASSET_UPLOAD_CONFIG: {
    thumbnailDimensions: { width: 200, height: 200 },
    thumbnailPath:       'visual-assets/thumbnails/',
  },
}))

const mockStorageUpload    = vi.fn()
const mockStorageGetPublic = vi.fn()

// ─── SUT ────────────────────────────────────────────────────────────────────

import { thumbnailService } from './thumbnail.service'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMockSupabaseClient() {
  return {
    storage: {
      from: vi.fn(() => ({
        upload:       mockStorageUpload,
        getPublicUrl: mockStorageGetPublic,
      })),
    },
  } as unknown as import('@supabase/supabase-js').SupabaseClient
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  // Default happy-path
  mockToBuffer.mockResolvedValue(Buffer.from('webp-thumbnail'))
  mockStorageUpload.mockResolvedValue({ error: null })
  mockStorageGetPublic.mockReturnValue({
    data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/bucket/visual-assets/thumbnails/test.webp' },
  })
})

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('thumbnailService', () => {
  describe('generate()', () => {
    it('generates WebP thumbnail for PNG', async () => {
      const inputBuffer = Buffer.from('fake-png-data')
      const result = await thumbnailService.generate(inputBuffer, 'image/png')

      expect(result).toBeInstanceOf(Buffer)
      expect(mockResize).toHaveBeenCalledWith(200, 200, { fit: 'cover' })
      expect(mockWebp).toHaveBeenCalledWith({ quality: 80 })
      expect(mockToBuffer).toHaveBeenCalled()
    })

    it('returns null for SVG', async () => {
      const result = await thumbnailService.generate(Buffer.from('svg'), 'image/svg+xml')

      expect(result).toBeNull()
      expect(mockResize).not.toHaveBeenCalled()
    })
  })

  describe('generateAndUpload()', () => {
    it('uploads WebP thumbnail and returns public URL for PNG', async () => {
      const supabase = makeMockSupabaseClient()
      const result = await thumbnailService.generateAndUpload(
        Buffer.from('fake-png'),
        'image/png',
        '1234567890-abc123.png',
        supabase,
        'bucket'
      )

      expect(result).toContain('thumbnails/')
      expect(mockStorageUpload).toHaveBeenCalledWith(
        'visual-assets/thumbnails/1234567890-abc123.webp',
        expect.any(Buffer),
        expect.objectContaining({ contentType: 'image/webp' })
      )
    })

    it('returns null when upload fails without throwing', async () => {
      mockStorageUpload.mockResolvedValue({ error: { message: 'Storage full' } })
      const supabase = makeMockSupabaseClient()

      const result = await thumbnailService.generateAndUpload(
        Buffer.from('fake-png'),
        'image/png',
        'test.png',
        supabase,
        'bucket'
      )

      expect(result).toBeNull()
    })
  })
})
