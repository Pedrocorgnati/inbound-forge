// module-10: Visual Asset Service — Unit Tests
// Rastreabilidade: TASK-1 ST001+ST004, INT-063

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPrisma = {
  visualAsset: {
    findMany:   vi.fn(),
    count:      vi.fn(),
    findFirst:  vi.fn(),
    findUnique: vi.fn(),
    create:     vi.fn(),
    update:     vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

const mockStorageUpload    = vi.fn()
const mockStorageGetPublic = vi.fn()
const mockStorageRemove    = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload:       mockStorageUpload,
        getPublicUrl: mockStorageGetPublic,
        remove:       mockStorageRemove,
      })),
    },
  })),
}))

const mockSharpMetadata = vi.fn()

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    metadata: mockSharpMetadata,
  })),
}))

const mockGenerateAndUpload = vi.fn()

vi.mock('./thumbnail.service', () => ({
  thumbnailService: {
    generateAndUpload: mockGenerateAndUpload,
  },
}))

vi.mock('@/lib/sentry', () => ({
  captureException: vi.fn(),
  captureMessage:   vi.fn(),
}))

vi.mock('@/lib/constants/asset-library', () => ({
  ASSET_UPLOAD_CONFIG: {
    maxFileSizeBytes:    5_000_000,
    allowedTypes:        ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    thumbnailDimensions: { width: 200, height: 200 },
    storagePath:         'visual-assets/',
    thumbnailPath:       'visual-assets/thumbnails/',
    pageSize:            24,
  },
}))

// ─── SUT ────────────────────────────────────────────────────────────────────

import { visualAssetService } from './visual-asset.service'

// ─── Helpers ────────────────────────────────────────────────────────────────

function createMockFile(name: string, type: string, size = 1024): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type })
}

function makePrismaAsset(overrides: Record<string, unknown> = {}) {
  return {
    id:            'asset-001',
    fileName:      '1234567890-abc123.png',
    originalName:  'logo.png',
    fileType:      'image/png',
    fileSizeBytes: 1024,
    widthPx:       800,
    heightPx:      600,
    storageUrl:    'https://example.supabase.co/storage/v1/object/public/bucket/visual-assets/1234567890-abc123.png',
    thumbnailUrl:  'https://example.supabase.co/storage/v1/object/public/bucket/visual-assets/thumbnails/1234567890-abc123.webp',
    altText:       null,
    tags:          [],
    usedInJobs:    [],
    isActive:      true,
    createdAt:     new Date(),
    updatedAt:     new Date(),
    ...overrides,
  }
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  // Env vars needed by getStorageClient()
  process.env.NEXT_PUBLIC_SUPABASE_URL   = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY  = 'test-service-role-key'
  process.env.SUPABASE_STORAGE_BUCKET    = 'bucket'

  // Default happy-path mocks
  mockStorageUpload.mockResolvedValue({ error: null })
  mockStorageGetPublic.mockReturnValue({
    data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/bucket/visual-assets/mock-file.png' },
  })
  mockSharpMetadata.mockResolvedValue({ width: 800, height: 600 })
  mockGenerateAndUpload.mockResolvedValue(
    'https://example.supabase.co/storage/v1/object/public/bucket/visual-assets/thumbnails/mock-file.webp'
  )
})

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('visualAssetService', () => {
  // ── list ────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('returns paginated items with total, page, and totalPages', async () => {
      const items = [makePrismaAsset(), makePrismaAsset({ id: 'asset-002' })]
      mockPrisma.visualAsset.findMany.mockResolvedValue(items)
      mockPrisma.visualAsset.count.mockResolvedValue(50)

      const result = await visualAssetService.list({ page: 2, limit: 24 })

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(50)
      expect(result.page).toBe(2)
      expect(result.totalPages).toBe(3) // ceil(50/24)
      expect(mockPrisma.visualAsset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 24, take: 24 })
      )
    })

    it('filters by fileType when provided', async () => {
      mockPrisma.visualAsset.findMany.mockResolvedValue([])
      mockPrisma.visualAsset.count.mockResolvedValue(0)

      await visualAssetService.list({ page: 1, limit: 24, fileType: 'image/svg+xml' })

      expect(mockPrisma.visualAsset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ fileType: 'image/svg+xml' }),
        })
      )
    })

    it('filters by tag when provided', async () => {
      mockPrisma.visualAsset.findMany.mockResolvedValue([])
      mockPrisma.visualAsset.count.mockResolvedValue(0)

      await visualAssetService.list({ page: 1, limit: 24, tag: 'logo' })

      expect(mockPrisma.visualAsset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tags: { has: 'logo' } }),
        })
      )
    })
  })

  // ── upload ──────────────────────────────────────────────────────────────

  describe('upload()', () => {
    it('returns VisualAsset with storageUrl and thumbnailUrl for PNG', async () => {
      const created = makePrismaAsset()
      mockPrisma.visualAsset.create.mockResolvedValue(created)

      const file   = createMockFile('logo.png', 'image/png')
      const result = await visualAssetService.upload(file, 'Alt text')

      expect(result.storageUrl).toBeTruthy()
      expect(result.thumbnailUrl).toBeTruthy()
      expect(mockPrisma.visualAsset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fileType: 'image/png',
            altText:  'Alt text',
            isActive: true,
          }),
        })
      )
    })

    it('returns thumbnailUrl null for SVG', async () => {
      mockGenerateAndUpload.mockResolvedValue(null)
      const created = makePrismaAsset({ thumbnailUrl: null, widthPx: null, heightPx: null, fileType: 'image/svg+xml' })
      mockPrisma.visualAsset.create.mockResolvedValue(created)

      const file   = createMockFile('icon.svg', 'image/svg+xml')
      const result = await visualAssetService.upload(file)

      expect(result.thumbnailUrl).toBeNull()
    })

    it('extracts widthPx and heightPx via Sharp for raster images', async () => {
      mockSharpMetadata.mockResolvedValue({ width: 1920, height: 1080 })
      mockPrisma.visualAsset.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        makePrismaAsset({ widthPx: data.widthPx, heightPx: data.heightPx })
      )

      const file = createMockFile('photo.png', 'image/png')
      await visualAssetService.upload(file)

      expect(mockPrisma.visualAsset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ widthPx: 1920, heightPx: 1080 }),
        })
      )
    })

    it('thumbnail failure does not cancel upload', async () => {
      mockGenerateAndUpload.mockRejectedValue(new Error('Sharp exploded'))
      const created = makePrismaAsset({ thumbnailUrl: null })
      mockPrisma.visualAsset.create.mockResolvedValue(created)

      const file   = createMockFile('photo.png', 'image/png')
      const result = await visualAssetService.upload(file)

      // Upload still succeeds, thumbnailUrl is null
      expect(result).toBeDefined()
      expect(mockPrisma.visualAsset.create).toHaveBeenCalled()
    })
  })

  // ── update ──────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('updates altText and tags', async () => {
      const updated = makePrismaAsset({ altText: 'New alt', tags: ['brand', 'logo'] })
      mockPrisma.visualAsset.update.mockResolvedValue(updated)

      const result = await visualAssetService.update('asset-001', {
        altText: 'New alt',
        tags:    ['brand', 'logo'],
      })

      expect(result.altText).toBe('New alt')
      expect(result.tags).toEqual(['brand', 'logo'])
      expect(mockPrisma.visualAsset.update).toHaveBeenCalledWith({
        where: { id: 'asset-001' },
        data:  { altText: 'New alt', tags: ['brand', 'logo'] },
      })
    })
  })

  // ── delete ──────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('marks isActive false and removes from Storage', async () => {
      const asset = makePrismaAsset()
      mockPrisma.visualAsset.findUnique.mockResolvedValue(asset)
      mockPrisma.visualAsset.update.mockResolvedValue({ ...asset, isActive: false })
      mockStorageRemove.mockResolvedValue({ error: null })

      await visualAssetService.delete('asset-001')

      // Soft-delete
      expect(mockPrisma.visualAsset.update).toHaveBeenCalledWith({
        where: { id: 'asset-001' },
        data:  { isActive: false },
      })

      // Storage removal
      expect(mockStorageRemove).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('visual-assets/'),
          expect.stringContaining('visual-assets/thumbnails/'),
        ])
      )
    })
  })
})
