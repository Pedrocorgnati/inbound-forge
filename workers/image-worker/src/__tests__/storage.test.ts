// module-9: TASK-3 — Storage tests (mocked Supabase, no real calls)
// Rastreabilidade: TASK-3 ST004, FEAT-creative-generation-004

import { describe, it, expect, vi } from 'vitest'
import { uploadImageToStorage } from '../storage'

const mockUpload    = vi.fn()
const mockGetPublic = vi.fn()

// vi.mock is hoisted by vitest — runs before imports
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload:       mockUpload,
        getPublicUrl: mockGetPublic,
      })),
    },
  })),
}))

const mockEnv = {
  SUPABASE_URL:              'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  SUPABASE_STORAGE_BUCKET:   'test-bucket',
}

describe('uploadImageToStorage', () => {
  it('returns public URL on success', async () => {
    mockUpload.mockResolvedValue({ data: { path: 'image-jobs/job-1.webp' }, error: null })
    mockGetPublic.mockReturnValue({ data: { publicUrl: 'https://cdn.supabase.co/test-bucket/image-jobs/job-1.webp' } })

    const url = await uploadImageToStorage(Buffer.from('fake'), 'job-1', 'webp', mockEnv)
    expect(url).toBe('https://cdn.supabase.co/test-bucket/image-jobs/job-1.webp')
  })

  it('throws when upload returns error', async () => {
    mockUpload.mockResolvedValue({ data: null, error: { message: 'Permission denied' } })
    mockGetPublic.mockReturnValue({ data: { publicUrl: '' } })

    await expect(
      uploadImageToStorage(Buffer.from('fake'), 'job-2', 'webp', mockEnv)
    ).rejects.toThrow('Storage upload failed')
  })

  it('throws AbortError when signal already aborted before upload', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      uploadImageToStorage(Buffer.from('fake'), 'job-3', 'webp', mockEnv, controller.signal)
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('uses correct content-type for webp', async () => {
    mockUpload.mockResolvedValue({ data: { path: 'image-jobs/job-4.webp' }, error: null })
    mockGetPublic.mockReturnValue({ data: { publicUrl: 'https://x.co/job-4.webp' } })

    await uploadImageToStorage(Buffer.from('fake'), 'job-4', 'webp', mockEnv)
    expect(mockUpload).toHaveBeenCalledWith(
      'image-jobs/job-4.webp',
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/webp' })
    )
  })

  it('uses correct content-type for png', async () => {
    mockUpload.mockResolvedValue({ data: { path: 'image-jobs/job-5.png' }, error: null })
    mockGetPublic.mockReturnValue({ data: { publicUrl: 'https://x.co/job-5.png' } })

    await uploadImageToStorage(Buffer.from('fake'), 'job-5', 'png', mockEnv)
    expect(mockUpload).toHaveBeenCalledWith(
      'image-jobs/job-5.png',
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/png' })
    )
  })
})
