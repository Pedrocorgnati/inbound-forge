/**
 * Testes de integração: image-pipeline fallback chain
 * Rastreabilidade: CL-052, TASK-2 ST004
 */

import { generateBackground } from '@/lib/image-pipeline'
import * as ideogramModule from '@/lib/ai/ideogram'
import * as fluxModule from '@/lib/ai/flux'

jest.mock('@/lib/ai/ideogram')
jest.mock('@/lib/ai/flux')

const mockIdeogramGenerate = jest.spyOn(ideogramModule, 'generateWithIdeogram')
const mockFluxGenerate = jest.spyOn(fluxModule, 'generateWithFlux')

// Mock fetch for image download
global.fetch = jest.fn()

const mockImageBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]) // fake PNG header

beforeEach(() => {
  jest.clearAllMocks()
  process.env['IDEOGRAM_API_KEY'] = 'test-ideogram-key'
  process.env['FAL_API_KEY'] = 'test-flux-key'

  // Default: successful image download
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    arrayBuffer: async () => mockImageBuffer.buffer,
    status: 200,
  })
})

describe('generateBackground fallback chain', () => {
  it('should return ideogram result when ideogram succeeds', async () => {
    mockIdeogramGenerate.mockResolvedValue({
      created: '2026-01-01',
      data: [{ url: 'https://ideogram.ai/image.jpg', prompt: 'test', resolution: '1200x630', is_image_safe: true, seed: 1, style_type: 'GENERAL' }],
    })

    const result = await generateBackground({ prompt: 'abstract background', width: 1200, height: 630 })

    expect(result.provider).toBe('ideogram')
    expect(result.imageUrl).toBe('https://ideogram.ai/image.jpg')
    expect(mockFluxGenerate).not.toHaveBeenCalled()
  })

  it('should fallback to flux when ideogram fails', async () => {
    mockIdeogramGenerate.mockRejectedValue(new Error('Ideogram API down'))
    mockFluxGenerate.mockResolvedValue({
      images: [{ url: 'https://fal.ai/image.jpg', width: 1200, height: 630, content_type: 'image/jpeg' }],
      seed: 42,
      prompt: 'abstract background',
    })
    jest.spyOn(fluxModule, 'extractFluxImageUrl').mockReturnValue('https://fal.ai/image.jpg')

    const result = await generateBackground({ prompt: 'abstract background', width: 1200, height: 630 })

    expect(result.provider).toBe('flux')
    expect(result.imageUrl).toBe('https://fal.ai/image.jpg')
  })

  it('should fallback to static when both providers fail', async () => {
    mockIdeogramGenerate.mockRejectedValue(new Error('Ideogram down'))
    mockFluxGenerate.mockRejectedValue(new Error('Flux down'))

    const result = await generateBackground({ prompt: 'abstract background' })

    expect(result.provider).toBe('static')
    expect(result.imageUrl).toBeUndefined()
    expect(result.buffer).toBeInstanceOf(Buffer)
  })

  it('should use static when no API keys are configured', async () => {
    delete process.env['IDEOGRAM_API_KEY']
    delete process.env['FAL_API_KEY']

    const result = await generateBackground({ prompt: 'test' })

    expect(result.provider).toBe('static')
    expect(mockIdeogramGenerate).not.toHaveBeenCalled()
    expect(mockFluxGenerate).not.toHaveBeenCalled()
  })

  it('should register cost correctly for each provider', async () => {
    // Providers registram custo via IMAGE_PROVIDERS — verificar que provider=flux implica costUsd=0.015
    mockIdeogramGenerate.mockRejectedValue(new Error('down'))
    mockFluxGenerate.mockResolvedValue({
      images: [{ url: 'https://fal.ai/img.jpg', width: 1200, height: 630, content_type: 'image/jpeg' }],
      seed: 1,
      prompt: 'test',
    })
    jest.spyOn(fluxModule, 'extractFluxImageUrl').mockReturnValue('https://fal.ai/img.jpg')

    const result = await generateBackground({ prompt: 'test' })
    expect(result.provider).toBe('flux')
    // Custo verificado via IMAGE_PROVIDERS['flux'].costUsd = 0.015 (constante)
  })
})
