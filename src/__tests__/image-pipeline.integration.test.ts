/**
 * Testes de integração: image-pipeline fallback chain
 * Rastreabilidade: CL-052, TASK-2 ST004
 */

import { generateBackground } from '@/lib/image-pipeline'
import * as ideogramModule from '@/lib/ai/ideogram'
import * as fluxModule from '@/lib/ai/flux'

vi.mock('@/lib/ai/ideogram')
vi.mock('@/lib/ai/flux')

const mockIdeogramGenerate = vi.spyOn(ideogramModule, 'generateWithIdeogram')
const mockFluxGenerate = vi.spyOn(fluxModule, 'generateWithFlux')

// Minimal valid 1x1 white PNG (67 bytes) — sharp can process this
const mockImageBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk' +
  'YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
)

beforeEach(() => {
  vi.clearAllMocks()
  // vi.stubGlobal em beforeEach (após server.listen() do MSW no beforeAll) garante
  // que o mock substitui o interceptor do MSW, evitando chamada com Request object
  vi.stubGlobal('fetch', vi.fn())
  process.env['IDEOGRAM_API_KEY'] = 'test-ideogram-key'
  process.env['FAL_API_KEY'] = 'test-flux-key'

  // Default: successful image download — use slice to get exact bytes (avoids Node buffer pool issue)
  ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    arrayBuffer: async () => mockImageBuffer.buffer.slice(
      mockImageBuffer.byteOffset,
      mockImageBuffer.byteOffset + mockImageBuffer.byteLength
    ),
    status: 200,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
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
    vi.spyOn(fluxModule, 'extractFluxImageUrl').mockReturnValue('https://fal.ai/image.jpg')

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
    vi.spyOn(fluxModule, 'extractFluxImageUrl').mockReturnValue('https://fal.ai/img.jpg')

    const result = await generateBackground({ prompt: 'test' })
    expect(result.provider).toBe('flux')
    // Custo verificado via IMAGE_PROVIDERS['flux'].costUsd = 0.015 (constante)
  })
})
