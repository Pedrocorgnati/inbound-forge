// module-10: Asset Compose Service — Performance Regression Tests
// Rastreabilidade: TASK-2 ST001, INT-062, G-008 (M9 ressalva)
//
// Objetivo: garantir que composeWithAsset() não introduza latência desnecessária
// (loops bloqueantes, alocações excessivas, sleep acidental).
//
// NOTA: com mocks, o tempo medido é de CPU local — sempre < 3s.
// Validação em cenário real (Satori + Sharp + Supabase) deve ser feita em staging:
//   - Rodar 10 composições reais e checar `processingMs` nos logs do ImageJob.
//   - SLA esperado: p95 < 3000ms em máquina de staging com conexão real ao Storage.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockFindById, mockRecordJobUsage } = vi.hoisted(() => ({
  mockFindById:       vi.fn(),
  mockRecordJobUsage: vi.fn(),
}))

vi.mock('./visual-asset.service', () => ({
  visualAssetService: { findById: mockFindById, recordJobUsage: mockRecordJobUsage },
}))

const { mockStorageDownload, mockStorageUpload, mockStorageGetPublic } = vi.hoisted(() => ({
  mockStorageDownload:    vi.fn(),
  mockStorageUpload:      vi.fn(),
  mockStorageGetPublic:   vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        download:     mockStorageDownload,
        upload:       mockStorageUpload,
        getPublicUrl: mockStorageGetPublic,
      })),
    },
  })),
}))

const { mockRenderTemplate, mockComposeFinalImage } = vi.hoisted(() => ({
  mockRenderTemplate:   vi.fn(),
  mockComposeFinalImage: vi.fn(),
}))

vi.mock('@/lib/image-pipeline', () => ({
  renderTemplate:    mockRenderTemplate,
  composeFinalImage: mockComposeFinalImage,
}))

const { mockPrismaUpdate } = vi.hoisted(() => ({ mockPrismaUpdate: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: { imageJob: { update: mockPrismaUpdate } },
}))

vi.mock('@/lib/constants/image-worker', () => ({
  IMAGE_DIMENSIONS: {
    STATIC_LANDSCAPE: { widthPx: 1200, heightPx: 628 },
  },
}))

// ─── SUT ─────────────────────────────────────────────────────────────────────

import { assetComposeService } from './asset-compose.service'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAsset(overrides = {}) {
  return {
    id:            'asset-perf-001',
    widthPx:       1200,
    heightPx:      628,
    storageUrl:    'https://example.supabase.co/storage/v1/object/public/inbound-forge-assets/uid/img.png',
    thumbnailUrl:  null,
    isActive:      true,
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('assetComposeService — performance', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    process.env.NEXT_PUBLIC_SUPABASE_URL  = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    process.env.SUPABASE_STORAGE_BUCKET   = 'inbound-forge-assets'

    mockFindById.mockResolvedValue(makeAsset())
    mockRecordJobUsage.mockResolvedValue(undefined)

    // Simula download de um buffer PNG de 100KB
    const fakeBlob = new Blob([new Uint8Array(100_000)])
    mockStorageDownload.mockResolvedValue({ data: fakeBlob, error: null })

    mockRenderTemplate.mockResolvedValue('<svg>...</svg>')
    mockComposeFinalImage.mockResolvedValue(Buffer.alloc(50_000))

    mockStorageUpload.mockResolvedValue({ error: null })
    mockStorageGetPublic.mockReturnValue({
      data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/inbound-forge-assets/image-jobs/job-001.webp' },
    })

    mockPrismaUpdate.mockResolvedValue({})
  })

  it('composeWithAsset completes in under 3000ms with mocked dependencies', async () => {
    const start = performance.now()

    await assetComposeService.composeWithAsset({
      jobId:         'job-001',
      templateType:  'STATIC_LANDSCAPE',
      templateProps: { title: 'Perf test' },
      assetId:       'asset-perf-001',
    })

    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(3000)
  }, 5_000)

  it('previewCompose completes in under 3000ms with mocked dependencies', async () => {
    const start = performance.now()

    await assetComposeService.previewCompose(
      'STATIC_LANDSCAPE',
      { title: 'Preview perf test' },
      'asset-perf-001',
    )

    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(3000)
  }, 5_000)

  it('returns processingMs field within the result', async () => {
    const result = await assetComposeService.composeWithAsset({
      jobId:         'job-002',
      templateType:  'STATIC_LANDSCAPE',
      templateProps: {},
      assetId:       'asset-perf-001',
    })

    expect(typeof result.processingMs).toBe('number')
    expect(result.processingMs).toBeGreaterThanOrEqual(0)
    expect(result.processingMs).toBeLessThan(3000)
  }, 5_000)
})
