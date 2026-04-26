// module-10: Asset Compose Service — Unit Tests
// Rastreabilidade: TASK-2 ST001, INT-062, INT-063

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPrisma = {
  imageJob: {
    update: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

const mockFindById        = vi.fn()
const mockRecordJobUsage  = vi.fn()

vi.mock('./visual-asset.service', () => ({
  visualAssetService: {
    findById:       mockFindById,
    recordJobUsage: mockRecordJobUsage,
  },
}))

const mockRenderTemplate     = vi.fn()
const mockComposeFinalImage  = vi.fn()

vi.mock('@/lib/image-pipeline', () => ({
  renderTemplate:     mockRenderTemplate,
  composeFinalImage:  mockComposeFinalImage,
}))

vi.mock('@/lib/constants/image-worker', () => ({
  IMAGE_DIMENSIONS: {
    CAROUSEL:          { widthPx: 1080, heightPx: 1080 },
    STATIC_LANDSCAPE:  { widthPx: 1200, heightPx: 630  },
    STATIC_PORTRAIT:   { widthPx: 1080, heightPx: 1350 },
    VIDEO_COVER:       { widthPx: 1080, heightPx: 1080 },
    BEFORE_AFTER:      { widthPx: 1080, heightPx: 1350 },
    ERROR_CARD:        { widthPx: 1080, heightPx: 1350 },
    SOLUTION_CARD:     { widthPx: 1200, heightPx: 630  },
    BACKSTAGE_CARD:    { widthPx: 1080, heightPx: 1080 },
  },
}))

const mockStorageUpload    = vi.fn()
const mockStorageGetPublic = vi.fn()
const mockStorageDownload  = vi.fn()

vi.mock('@/lib/sentry', () => ({
  captureException: vi.fn(),
  captureMessage:   vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload:       mockStorageUpload,
        getPublicUrl: mockStorageGetPublic,
        download:     mockStorageDownload,
      })),
    },
  })),
}))

// ─── SUT ────────────────────────────────────────────────────────────────────

import { assetComposeService, isAssetCompatibleWithTemplate } from './asset-compose.service'
import type { VisualAsset as PrismaVisualAsset } from '@prisma/client'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makePrismaAsset(overrides: Partial<PrismaVisualAsset> = {}): PrismaVisualAsset {
  return {
    id:            'asset-001',
    fileName:      '1234567890-abc123.png',
    originalName:  'logo.png',
    fileType:      'image/png',
    fileSizeBytes: 1024,
    widthPx:       1080,
    heightPx:      1080,
    storageUrl:    'https://example.supabase.co/storage/v1/object/public/bucket/visual-assets/1234567890-abc123.png',
    thumbnailUrl:  'https://example.supabase.co/storage/v1/object/public/bucket/visual-assets/thumbnails/1234567890-abc123.webp',
    altText:       null,
    tags:          [],
    usedInJobs:    [],
    isActive:      true,
    createdAt:     new Date(),
    updatedAt:     new Date(),
    ...overrides,
  } as PrismaVisualAsset
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  process.env.NEXT_PUBLIC_SUPABASE_URL  = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  process.env.SUPABASE_STORAGE_BUCKET   = 'bucket'

  // Default happy-path
  mockRenderTemplate.mockResolvedValue('<svg>template</svg>')
  mockComposeFinalImage.mockResolvedValue(Buffer.from('composed-image'))
  mockStorageUpload.mockResolvedValue({ error: null })
  mockStorageGetPublic.mockReturnValue({
    data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/bucket/image-jobs/job-001.webp' },
  })
  mockStorageDownload.mockResolvedValue({
    data: new Blob([Buffer.from('downloaded-image')]),
    error: null,
  })
  mockPrisma.imageJob.update.mockResolvedValue({})
  mockRecordJobUsage.mockResolvedValue(undefined)
})

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('isAssetCompatibleWithTemplate()', () => {
  it('returns true for 1:1 asset with 1:1 template (CAROUSEL)', () => {
    const asset = makePrismaAsset({ widthPx: 1080, heightPx: 1080 })
    expect(isAssetCompatibleWithTemplate(asset, 'CAROUSEL')).toBe(true)
  })

  it('returns false for 16:9 asset with 1:1 template (CAROUSEL)', () => {
    const asset = makePrismaAsset({ widthPx: 1920, heightPx: 1080 })
    expect(isAssetCompatibleWithTemplate(asset, 'CAROUSEL')).toBe(false)
  })

  it('returns true for SVG with null dimensions', () => {
    const asset = makePrismaAsset({ widthPx: null, heightPx: null })
    expect(isAssetCompatibleWithTemplate(asset, 'CAROUSEL')).toBe(true)
  })

  it('tolerates 20% aspect ratio deviation (1.15:1 with 1:1)', () => {
    // 1.15:1 ratio — difference from 1:1 is 0.15, which is < 20% of 1.0
    const asset = makePrismaAsset({ widthPx: 1150, heightPx: 1000 })
    expect(isAssetCompatibleWithTemplate(asset, 'CAROUSEL')).toBe(true)
  })
})

describe('assetComposeService', () => {
  describe('composeWithAsset()', () => {
    it('throws IMAGE_080 when asset is not found', async () => {
      mockFindById.mockResolvedValue(null)

      await expect(
        assetComposeService.composeWithAsset({
          jobId:         'job-001',
          templateType:  'CAROUSEL',
          templateProps: { title: 'Test' },
          assetId:       'nonexistent',
        })
      ).rejects.toThrow(
        expect.objectContaining({ code: 'IMAGE_080' })
      )
    })

    it('full pipeline returns resultUrl', async () => {
      const asset = makePrismaAsset()
      mockFindById.mockResolvedValue(asset)

      const result = await assetComposeService.composeWithAsset({
        jobId:         'job-001',
        templateType:  'CAROUSEL',
        templateProps: { title: 'Test' },
        assetId:       'asset-001',
      })

      expect(result.resultUrl).toContain('image-jobs/job-001.webp')
      expect(result.processingMs).toBeGreaterThanOrEqual(0)
      expect(mockRenderTemplate).toHaveBeenCalledWith('CAROUSEL', { title: 'Test' })
      expect(mockComposeFinalImage).toHaveBeenCalled()
      expect(mockPrisma.imageJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job-001' },
          data:  expect.objectContaining({ status: 'DONE' }),
        })
      )
      expect(mockRecordJobUsage).toHaveBeenCalledWith('asset-001', 'job-001')
    })
  })
})
