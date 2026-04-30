/**
 * Canonical Integration Test — POST /api/visual-assets
 * Módulo: module-10-asset-library (TASK-1 ST001+ST004)
 * Rastreabilidade: INT-063, QUAL-005
 *
 * Cobre os 4 cenários críticos da rota canônica de upload de assets:
 *   SC-1: VAL_001 — campo file ausente
 *   SC-2: VAL_002 — tipo MIME não suportado
 *   SC-3: VAL_003 — arquivo > 5 MB
 *   SC-4: VAL_004 — MIME spoof (magic bytes divergem do Content-Type declarado)
 *
 * Mocks: visualAssetService (sem acesso a Storage real), requireSession.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/api-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>('@/lib/api-auth')
  return {
    ...actual,
    requireSession: vi.fn(async () => ({
      user:     { id: '00000000-0000-0000-0000-000000000001' },
      response: null,
    })),
    ok:           actual.ok,
    okPaginated:  actual.okPaginated,
    validationError: actual.validationError,
  }
})

vi.mock('@/lib/services/visual-asset.service', () => ({
  visualAssetService: {
    upload: vi.fn(async (_file: File, userId: string, altText?: string) => ({
      id:            'test-asset-uuid',
      fileName:      'test.png',
      originalName:  'test.png',
      fileType:      'image/png',
      fileSizeBytes: 8,
      widthPx:       null,
      heightPx:      null,
      storageUrl:    `https://example.supabase.co/storage/v1/object/public/inbound-forge-assets/${userId}/test.png`,
      thumbnailUrl:  null,
      altText:       altText ?? null,
      tags:          [],
      usedInJobs:    [],
      isActive:      true,
      createdAt:     new Date(),
      updatedAt:     new Date(),
    })),
    list: vi.fn(async () => ({ items: [], total: 0, page: 1, totalPages: 0 })),
  },
}))

// ─── SUT ───────────────────────────────────────────────────────────────────

async function importRoute() {
  return import('@/app/api/visual-assets/route')
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const PNG_MAGIC  = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const JPEG_MAGIC = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const PDF_MAGIC  = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]) // %PDF-

function buildRequest(opts: {
  file?:     File
  altText?:  string
  hasFile?:  boolean
}): Request {
  const form = new FormData()
  if (opts.hasFile !== false) {
    if (opts.file) {
      form.append('file', opts.file)
    }
  }
  if (opts.altText) {
    form.append('altText', opts.altText)
  }
  return new Request('http://test/api/visual-assets', {
    method: 'POST',
    body:   form as never,
  })
}

function makeFile(name: string, mime: string, bytes: Uint8Array): File {
  return new File([bytes], name, { type: mime })
}

// ─── Setup ─────────────────────────────────────────────────────────────────

beforeAll(() => { /* no real DB needed — all mocked */ })
afterAll(() => vi.clearAllMocks())

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('POST /api/visual-assets — canonical upload route', () => {

  // SC-1: campo file ausente → VAL_001
  it('SC-1: retorna 400 VAL_001 quando campo file está ausente', async () => {
    const { POST } = await importRoute()
    const req = buildRequest({ hasFile: false })
    const res = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await (res as Response).json()
    expect(body.error.code).toBe('VAL_001')
  })

  // SC-2: MIME não suportado → VAL_002
  it('SC-2: retorna 400 VAL_002 para tipo MIME não suportado (application/pdf)', async () => {
    const { POST } = await importRoute()
    const file = makeFile('doc.pdf', 'application/pdf', PDF_MAGIC)
    const req  = buildRequest({ file })
    const res  = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await (res as Response).json()
    expect(body.error.code).toBe('VAL_002')
  })

  // SC-3: arquivo > 5MB → VAL_003
  it('SC-3: retorna 400 VAL_003 quando arquivo excede 5 MB', async () => {
    const { POST } = await importRoute()
    const bigBytes = new Uint8Array(5 * 1_000_000 + 1)
    // Cabeçalho PNG válido para não disparar VAL_004
    bigBytes.set(PNG_MAGIC, 0)
    const file = makeFile('huge.png', 'image/png', bigBytes)
    const req  = buildRequest({ file })
    const res  = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await (res as Response).json()
    expect(body.error.code).toBe('VAL_003')
  })

  // SC-4: MIME spoof (magic bytes diferentes do Content-Type) → VAL_004
  it('SC-4: retorna 400 VAL_004 quando magic bytes divergem do Content-Type declarado', async () => {
    const { POST } = await importRoute()
    // Declara image/png mas bytes são de JPEG
    const file = makeFile('spoof.png', 'image/png', JPEG_MAGIC)
    const req  = buildRequest({ file })
    const res  = await POST(req as never)

    expect(res.status).toBe(400)
    const body = await (res as Response).json()
    expect(body.error.code).toBe('VAL_004')
  })

  // Happy path: PNG válido → 201 com storageUrl contendo userId
  it('Happy path: retorna 201 com asset criado para PNG válido', async () => {
    const { POST } = await importRoute()
    const file = makeFile('logo.png', 'image/png', PNG_MAGIC)
    const req  = buildRequest({ file, altText: 'Logo da empresa' })
    const res  = await POST(req as never)

    expect(res.status).toBe(201)
    const body = await (res as Response).json()
    expect(body.data ?? body).toMatchObject({
      id:       'test-asset-uuid',
      fileType: 'image/png',
      isActive: true,
    })
    expect((body.data ?? body).storageUrl).toContain('00000000-0000-0000-0000-000000000001')
  })

})
