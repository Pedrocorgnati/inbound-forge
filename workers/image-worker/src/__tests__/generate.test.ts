// module-9: Image Generation Orchestrator Tests
// Rastreabilidade: TASK-3 ST004 ST005, FEAT-creative-generation-004, CX-02

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRenderTemplate = vi.fn()
const mockGenerateBackground = vi.fn()
const mockSelectProvider = vi.fn()
const mockComposeFinalImage = vi.fn()
const mockUploadImageToStorage = vi.fn()
const mockRecordCost = vi.fn()

vi.mock('../render', () => ({
  renderTemplate: (...args: unknown[]) => mockRenderTemplate(...args),
}))

vi.mock('../providers/index', () => ({
  generateBackground: (...args: unknown[]) => mockGenerateBackground(...args),
  selectProvider: (...args: unknown[]) => mockSelectProvider(...args),
}))

vi.mock('../compose', () => ({
  composeFinalImage: (...args: unknown[]) => mockComposeFinalImage(...args),
}))

vi.mock('../storage', () => ({
  uploadImageToStorage: (...args: unknown[]) => mockUploadImageToStorage(...args),
}))

vi.mock('../health', () => ({
  recordCost: (...args: unknown[]) => mockRecordCost(...args),
}))

const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEnv() {
  return {
    DATABASE_URL: 'postgres://test',
    UPSTASH_REDIS_REST_URL: 'https://redis.test',
    UPSTASH_REDIS_REST_TOKEN: 'tok',
    NEXT_PUBLIC_SUPABASE_URL: 'https://supa.test',
    SUPABASE_SERVICE_ROLE_KEY: 'svc',
    SUPABASE_STORAGE_BUCKET: 'bucket',
    IDEOGRAM_API_KEY: 'ideo-key',
    FAL_API_KEY: 'fal-key',
    IMAGE_WORKER_TIMEOUT_MS: 60_000,
  } as any
}

function makeOpts(overrides: Record<string, unknown> = {}) {
  return {
    jobId: 'job-gen-1',
    templateType: 'CAROUSEL' as const,
    templateProps: { headline: 'Test Headline', brandColor: '#FF0000' },
    prompt: 'generate a cool background',
    contentPieceId: 'cp-1',
    format: 'webp' as const,
    ...overrides,
  }
}

function makeDb() {
  const update = vi.fn().mockResolvedValue({})
  return {
    mock: { contentPiece: { update } } as any,
    contentPieceUpdate: update,
  }
}

function setupSuccessMocks() {
  mockRenderTemplate.mockResolvedValue('<svg>template</svg>')
  mockGenerateBackground.mockResolvedValue(Buffer.from('bg-pixels'))
  mockSelectProvider.mockReturnValue('flux')
  mockComposeFinalImage.mockResolvedValue(Buffer.from('final-pixels'))
  mockUploadImageToStorage.mockResolvedValue('https://cdn.test/images/job-gen-1.webp')
}

describe('generateImage', () => {
  let generateImage: typeof import('../generate')['generateImage']

  beforeEach(async () => {
    vi.resetModules()
    mockRenderTemplate.mockReset()
    mockGenerateBackground.mockReset()
    mockSelectProvider.mockReset()
    mockComposeFinalImage.mockReset()
    mockUploadImageToStorage.mockReset()
    mockRecordCost.mockReset()
    stdoutSpy.mockClear()

    const mod = await import('../generate')
    generateImage = mod.generateImage
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---------- Full pipeline success ----------

  it('executes render -> background -> compose -> upload -> CX-02 update pipeline', async () => {
    setupSuccessMocks()
    const { mock, contentPieceUpdate } = makeDb()
    const env = makeEnv()
    const opts = makeOpts()

    const result = await generateImage(opts, mock, env)

    // 1. Render template
    expect(mockRenderTemplate).toHaveBeenCalledWith('CAROUSEL', opts.templateProps)

    // 2. Generate background with correct dimensions (1080x1080 for CAROUSEL)
    expect(mockGenerateBackground).toHaveBeenCalledWith(
      'CAROUSEL',
      'generate a cool background',
      { widthPx: 1080, heightPx: 1080 },
      { IDEOGRAM_API_KEY: 'ideo-key', FAL_API_KEY: 'fal-key' },
      undefined, // signal
      '#FF0000'
    )

    // 3. Compose final image
    expect(mockComposeFinalImage).toHaveBeenCalledWith(
      '<svg>template</svg>',
      Buffer.from('bg-pixels'),
      { widthPx: 1080, heightPx: 1080 },
      'webp'
    )

    // 4. Upload
    expect(mockUploadImageToStorage).toHaveBeenCalledWith(
      Buffer.from('final-pixels'),
      'job-gen-1',
      'webp',
      {
        SUPABASE_URL: 'https://supa.test',
        SUPABASE_SERVICE_ROLE_KEY: 'svc',
        SUPABASE_STORAGE_BUCKET: 'bucket',
      },
      undefined // signal
    )

    // 5. CX-02: ContentPiece updated with image URL
    expect(contentPieceUpdate).toHaveBeenCalledWith({
      where: { id: 'cp-1' },
      data: { generatedImageUrl: 'https://cdn.test/images/job-gen-1.webp', imageJobId: 'job-gen-1' },
    })

    // Returns the public URL
    expect(result).toBe('https://cdn.test/images/job-gen-1.webp')
  })

  // ---------- Cost logging after success ----------

  it('emits cost log and calls recordCost after success', async () => {
    setupSuccessMocks()
    mockSelectProvider.mockReturnValue('flux')
    const { mock } = makeDb()
    const env = makeEnv()
    const opts = makeOpts()

    await generateImage(opts, mock, env)

    // recordCost called with correct structure
    expect(mockRecordCost).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-gen-1',
        provider: 'flux',
        costUsd: 0.015, // flux cost
        templateType: 'CAROUSEL',
        durationMs: expect.any(Number),
        recordedAt: expect.any(String),
      })
    )

    // stdout log includes image.generated event
    const logs = stdoutSpy.mock.calls.map(([arg]) => String(arg))
    expect(logs.some((l) => {
      const parsed = JSON.parse(l)
      return parsed.event === 'image.generated' && parsed.provider === 'flux' && parsed.costUsd === 0.015
    })).toBe(true)
  })

  // ---------- Cost for ideogram provider ----------

  it('logs correct cost for ideogram provider', async () => {
    setupSuccessMocks()
    mockSelectProvider.mockReturnValue('ideogram')
    const { mock } = makeDb()
    const env = makeEnv()
    const opts = makeOpts({ templateType: 'ERROR_CARD' })

    await generateImage(opts, mock, env)

    expect(mockRecordCost).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'ideogram',
        costUsd: 0.04,
      })
    )
  })

  // ---------- No contentPieceId — skips CX-02 update ----------

  it('skips ContentPiece update when contentPieceId is null', async () => {
    setupSuccessMocks()
    const { mock, contentPieceUpdate } = makeDb()
    const env = makeEnv()
    const opts = makeOpts({ contentPieceId: null })

    const result = await generateImage(opts, mock, env)

    expect(result).toBe('https://cdn.test/images/job-gen-1.webp')
    expect(contentPieceUpdate).not.toHaveBeenCalled()
  })

  it('skips ContentPiece update when contentPieceId is undefined', async () => {
    setupSuccessMocks()
    const { mock, contentPieceUpdate } = makeDb()
    const env = makeEnv()
    const opts = makeOpts({ contentPieceId: undefined })

    await generateImage(opts, mock, env)

    expect(contentPieceUpdate).not.toHaveBeenCalled()
  })

  // ---------- AbortSignal propagation ----------

  it('passes AbortSignal to generateBackground and uploadImageToStorage', async () => {
    setupSuccessMocks()
    const { mock } = makeDb()
    const env = makeEnv()
    const opts = makeOpts()
    const controller = new AbortController()

    await generateImage(opts, mock, env, controller.signal)

    // generateBackground receives the signal
    expect(mockGenerateBackground).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      controller.signal,
      expect.anything()
    )

    // uploadImageToStorage receives the signal
    expect(mockUploadImageToStorage).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      controller.signal
    )
  })

  it('rejects when signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    mockRenderTemplate.mockResolvedValue('<svg/>')
    mockGenerateBackground.mockRejectedValue(new DOMException('aborted', 'AbortError'))

    const { mock } = makeDb()
    const env = makeEnv()
    const opts = makeOpts()

    await expect(generateImage(opts, mock, env, controller.signal)).rejects.toThrow('AbortError')
  })

  // ---------- Fallback to static when providers fail ----------

  it('still returns an image when generateBackground falls back to static', async () => {
    // generateBackground "NEVER rejects — returns Buffer in all cases"
    // including a static fallback buffer
    mockRenderTemplate.mockResolvedValue('<svg>fallback</svg>')
    mockGenerateBackground.mockResolvedValue(Buffer.from('static-fallback'))
    mockSelectProvider.mockReturnValue('static')
    mockComposeFinalImage.mockResolvedValue(Buffer.from('composed-static'))
    mockUploadImageToStorage.mockResolvedValue('https://cdn.test/static.webp')

    const { mock } = makeDb()
    const env = makeEnv()
    const opts = makeOpts()

    const result = await generateImage(opts, mock, env)

    expect(result).toBe('https://cdn.test/static.webp')
    expect(mockSelectProvider).toHaveBeenCalledWith('CAROUSEL')

    // Cost should be 0 for static
    expect(mockRecordCost).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'static',
        costUsd: 0,
      })
    )
  })

  // ---------- Pipeline stage failure propagates ----------

  it('throws when renderTemplate fails', async () => {
    mockRenderTemplate.mockRejectedValue(new Error('template_not_found'))

    const { mock } = makeDb()
    const env = makeEnv()

    await expect(generateImage(makeOpts(), mock, env)).rejects.toThrow('template_not_found')
  })

  it('throws when composeFinalImage fails', async () => {
    mockRenderTemplate.mockResolvedValue('<svg/>')
    mockGenerateBackground.mockResolvedValue(Buffer.from('bg'))
    mockSelectProvider.mockReturnValue('flux')
    mockComposeFinalImage.mockRejectedValue(new Error('sharp_oom'))

    const { mock } = makeDb()
    const env = makeEnv()

    await expect(generateImage(makeOpts(), mock, env)).rejects.toThrow('sharp_oom')
  })

  it('throws when uploadImageToStorage fails', async () => {
    mockRenderTemplate.mockResolvedValue('<svg/>')
    mockGenerateBackground.mockResolvedValue(Buffer.from('bg'))
    mockSelectProvider.mockReturnValue('flux')
    mockComposeFinalImage.mockResolvedValue(Buffer.from('final'))
    mockUploadImageToStorage.mockRejectedValue(new Error('storage_403'))

    const { mock } = makeDb()
    const env = makeEnv()

    await expect(generateImage(makeOpts(), mock, env)).rejects.toThrow('storage_403')
  })

  // ---------- Default format is webp ----------

  it('defaults to webp format when not specified', async () => {
    setupSuccessMocks()
    const { mock } = makeDb()
    const env = makeEnv()
    const opts = makeOpts()
    delete (opts as any).format

    await generateImage(opts, mock, env)

    expect(mockComposeFinalImage).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'webp'
    )
  })

  // ---------- Uses default brand color when not provided ----------

  it('uses BRAND_COLOR_DEFAULT (#4F46E5) when brandColor not in props', async () => {
    setupSuccessMocks()
    const { mock } = makeDb()
    const env = makeEnv()
    const opts = makeOpts({
      templateProps: { headline: 'No Brand Color' }, // no brandColor
    })

    await generateImage(opts, mock, env)

    expect(mockGenerateBackground).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      '#4F46E5' // default
    )
  })
})
