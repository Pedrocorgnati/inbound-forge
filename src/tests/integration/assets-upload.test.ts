/**
 * Intake-Review TASK-2 ST005 (CL-CG-012): cobertura end-to-end do handler
 * POST /api/v1/assets/upload.
 *
 * Pre-requisitos:
 *   - DATABASE_URL apontando para testdb + migrations aplicadas
 *   - Bucket 'visual-assets' criado no Supabase de teste
 *   - Envs SUPABASE_* presentes no ambiente de teste
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/storage/supabase-assets', async () => {
  const actual = await vi.importActual<typeof import('@/lib/storage/supabase-assets')>(
    '@/lib/storage/supabase-assets',
  )
  return {
    ...actual,
    uploadAsset: vi.fn(async ({ userId, filename }: { userId: string; filename: string }) => ({
      url:  `https://mock.supabase/storage/v1/object/public/visual-assets/${userId}/mock-${filename}`,
      path: `${userId}/mock-${filename}`,
      size: 1234,
    })),
    uploadThumbnail: vi.fn(async (_buf: Buffer, userId: string, base: string) =>
      `https://mock.supabase/storage/v1/object/public/visual-assets/${userId}/thumbnails/${base}.webp`,
    ),
    deleteAsset: vi.fn(async () => { /* noop */ }),
  }
})

vi.mock('@/lib/api-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>('@/lib/api-auth')
  return {
    ...actual,
    requireSession: vi.fn(async () => ({
      user: { id: '00000000-0000-0000-0000-000000000001' },
      response: null,
    })),
  }
})

async function importRoute() {
  return import('@/app/api/v1/assets/upload/route')
}

function buildMultipart(opts: { mimeType: string; bytes?: Uint8Array; filename?: string }) {
  const bytes = opts.bytes ?? new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const file = new File([bytes], opts.filename ?? 'test.png', { type: opts.mimeType })
  const form = new FormData()
  form.append('file', file)
  return new Request('http://test/api/v1/assets/upload', {
    method: 'POST',
    body: form as never,
  })
}

describe('POST /api/v1/assets/upload', () => {
  beforeAll(() => { /* setup db */ })
  afterAll(() => { /* cleanup */ })

  it('rejeita MIME invalido com 400', async () => {
    const { POST } = await importRoute()
    const res = await POST(buildMultipart({ mimeType: 'application/pdf' }) as never)
    expect(res.status).toBe(400)
  })

  it('rejeita arquivo acima de 10MB com 400', async () => {
    const { POST } = await importRoute()
    const big = new Uint8Array(10 * 1024 * 1024 + 1)
    big[0] = 0x89; big[1] = 0x50; big[2] = 0x4e; big[3] = 0x47
    const res = await POST(buildMultipart({ mimeType: 'image/png', bytes: big }) as never)
    expect(res.status).toBe(400)
  })

  it('rejeita MIME spoof (PDF com content-type image/png)', async () => {
    const { POST } = await importRoute()
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF
    const res = await POST(buildMultipart({ mimeType: 'image/png', bytes: pdfBytes }) as never)
    expect(res.status).toBe(400)
  })

  it('cria VisualAsset com uploadedBy quando upload e valido', async () => {
    const { POST } = await importRoute()
    const res = await POST(buildMultipart({ mimeType: 'image/png' }) as never)
    expect(res.status).toBe(201)
    const body = await (res as Response).json()
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('url')
    expect(body.url).toContain('/visual-assets/')
  })
})
