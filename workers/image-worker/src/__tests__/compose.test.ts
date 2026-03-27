// module-9: TASK-8 — Compose tests (mocked Sharp + Resvg)
// Rastreabilidade: TASK-8 ST001, FEAT-creative-generation-005

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockToBuffer  = vi.fn()
const mockToFormat  = vi.fn(() => ({ toBuffer: mockToBuffer }))
const mockResize    = vi.fn(() => ({ toFormat: mockToFormat, composite: mockComposite }))
const mockComposite = vi.fn(() => ({ toFormat: mockToFormat }))

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize:    mockResize,
    composite: mockComposite,
    toFormat:  mockToFormat,
    toBuffer:  mockToBuffer,
  })),
}))

const mockAsPng = vi.fn()
const mockRender = vi.fn(() => ({ asPng: mockAsPng }))

vi.mock('@resvg/resvg-js', () => ({
  Resvg: vi.fn().mockImplementation(() => ({
    render: mockRender,
  })),
}))

import { composeFinalImage } from '../compose'

// ── Tests ────────────────────────────────────────────────────────────────────

describe('composeFinalImage', () => {
  const dims = { widthPx: 1080, heightPx: 1080 }
  const validSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="red" width="100" height="100"/></svg>'

  beforeEach(() => {
    vi.clearAllMocks()
    mockAsPng.mockReturnValue(Buffer.from('svg-png-data'))
    mockToBuffer.mockResolvedValue(Buffer.from('final-image'))
  })

  it('composes SVG + background to WebP buffer', async () => {
    const background = Buffer.from('background-image-data')

    const result = await composeFinalImage(validSvg, background, dims, 'webp')

    expect(result).toBeInstanceOf(Buffer)
    expect(result.toString()).toBe('final-image')
    // Sharp should resize the background with cover fit
    expect(mockResize).toHaveBeenCalledWith(1080, 1080, { fit: 'cover' })
    // Then composite the SVG overlay
    expect(mockComposite).toHaveBeenCalledWith([
      { input: expect.any(Buffer), blend: 'over' },
    ])
    expect(mockToFormat).toHaveBeenCalledWith('webp')
  })

  it('composes SVG + background to PNG buffer', async () => {
    const background = Buffer.from('background-image-data')

    const result = await composeFinalImage(validSvg, background, dims, 'png')

    expect(result).toBeInstanceOf(Buffer)
    expect(mockToFormat).toHaveBeenCalledWith('png')
  })

  it('composes SVG only (no background) correctly', async () => {
    const result = await composeFinalImage(validSvg, undefined, dims, 'webp')

    expect(result).toBeInstanceOf(Buffer)
    expect(result.toString()).toBe('final-image')
    // Without background, should resize SVG PNG directly
    expect(mockResize).toHaveBeenCalledWith(1080, 1080)
    expect(mockToFormat).toHaveBeenCalledWith('webp')
    // Composite should NOT be called — no background layer
    expect(mockComposite).not.toHaveBeenCalled()
  })

  it('defaults format to webp when not specified', async () => {
    const result = await composeFinalImage(validSvg, undefined, dims)

    expect(result).toBeInstanceOf(Buffer)
    expect(mockToFormat).toHaveBeenCalledWith('webp')
  })

  it('throws error when Resvg fails on invalid SVG', async () => {
    mockRender.mockImplementationOnce(() => {
      throw new Error('SVG parse error: invalid element')
    })

    await expect(
      composeFinalImage('not-valid-svg', undefined, dims)
    ).rejects.toThrow('SVG parse error')
  })
})
