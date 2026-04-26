import 'server-only'
// module-10: Image Pipeline — Next.js App Bridge
// Rastreabilidade: TASK-2 ST001, FEAT-creative-generation-009
//
// Reimplementa renderTemplate + composeFinalImage localmente para uso síncrono
// na API Route (sem Redis queue). Mesma lógica do worker mas rodando no Next.js.
//
// FONTS: carregadas de workers/image-worker/fonts/ (compartilhado no repositório)
// TODO: migrar para pacote @inbound-forge/render-engine ao criar monorepo

import satori        from 'satori'
import { Resvg }     from '@resvg/resvg-js'
import sharp         from 'sharp'
import * as fs       from 'fs'
import * as path     from 'path'
import React         from 'react'
import type { TemplateType } from '@/types/image-template'
import { IMAGE_DIMENSIONS, BRAND_COLOR_DEFAULT }  from '@/lib/constants/image-worker'
import { generateWithIdeogram } from '@/lib/ai/ideogram'
import { generateWithFlux, extractFluxImageUrl } from '@/lib/ai/flux'
import { canAttempt, markFailure, markSuccess } from '@/lib/ai/image-provider-fallback'
// Intake Review TASK-3 (CL-065/066): channel guard contra dimensoes incompativeis.
import { validateDimension, InvalidDimensionError } from '@/lib/image-dimensions'

export { validateDimension, InvalidDimensionError }

// ─── Background Generation (CL-050, CL-052) ──────────────────────────────────

export type ImageProvider = 'ideogram' | 'flux' | 'static'

export interface GenerateBackgroundRequest {
  prompt: string
  width?: number
  height?: number
  brandColor?: string
}

export interface GenerateBackgroundResult {
  /** Buffer da imagem final (PNG/WebP) */
  buffer: Buffer
  /** Provider que gerou a imagem */
  provider: ImageProvider
  /** URL da imagem gerada (apenas ideogram/flux — null para static) */
  imageUrl?: string
  /** TASK-2 ST004: true quando ambos providers falharam e foi usado fallback estático */
  isDegraded?: boolean
  /** Motivo da degradação para exibição ao operador */
  degradedReason?: string
}

/**
 * Gera background com fallback automatico: Ideogram → Flux → estatico.
 * Cada fallback loga o erro e o provider alternativo usado.
 * Rastreabilidade: CL-052, TASK-2 ST003
 */
export async function generateBackground(
  request: GenerateBackgroundRequest
): Promise<GenerateBackgroundResult> {
  const width  = request.width  ?? 1200
  const height = request.height ?? 630
  const ideogramApiKey = process.env['IDEOGRAM_API_KEY']
  const fluxApiKey     = process.env['FAL_API_KEY']

  // Tentativa 1: Ideogram (respeita circuit breaker)
  if (ideogramApiKey && canAttempt('ideogram')) {
    try {
      const aspectRatio = width > height ? 'ASPECT_16_9' : width === height ? 'ASPECT_1_1' : 'ASPECT_9_16'
      const ideogramRes = await generateWithIdeogram(ideogramApiKey, {
        image_request: {
          prompt: request.prompt,
          aspect_ratio: aspectRatio,
          style_type: 'GENERAL',
          magic_prompt_option: 'AUTO',
        },
      })

      const imageUrl = ideogramRes.data[0]?.url
      if (!imageUrl) throw new Error('Ideogram: resposta sem URL')

      const imgResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) })
      if (!imgResponse.ok) throw new Error(`Ideogram download error: ${imgResponse.status}`)
      const arrayBuffer = await imgResponse.arrayBuffer()
      const buffer = await sharp(Buffer.from(arrayBuffer))
        .resize(width, height, { fit: 'cover' })
        .webp({ quality: 85 })
        .toBuffer()

      markSuccess('ideogram')
      return { buffer, provider: 'ideogram', imageUrl }
    } catch (err) {
      markFailure('ideogram')
      console.warn('[image-pipeline] Ideogram falhou, tentando Flux:', err)
    }
  } else if (ideogramApiKey) {
    console.info('[image-pipeline] Ideogram em cooldown (circuit breaker aberto), pulando direto para Flux')
  }

  // Tentativa 2: Flux (respeita circuit breaker)
  if (fluxApiKey && canAttempt('flux')) {
    try {
      const fluxRes = await generateWithFlux(fluxApiKey, {
        prompt: request.prompt,
        width,
        height,
      })

      const imageUrl = extractFluxImageUrl(fluxRes)
      const imgResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) })
      if (!imgResponse.ok) throw new Error(`Flux download error: ${imgResponse.status}`)
      const arrayBuffer = await imgResponse.arrayBuffer()
      const buffer = await sharp(Buffer.from(arrayBuffer))
        .resize(width, height, { fit: 'cover' })
        .webp({ quality: 85 })
        .toBuffer()

      markSuccess('flux')
      return { buffer, provider: 'flux', imageUrl }
    } catch (err) {
      markFailure('flux')
      console.warn('[image-pipeline] Flux falhou, usando imagem estatica:', err)
    }
  } else if (fluxApiKey) {
    console.info('[image-pipeline] Flux em cooldown (circuit breaker aberto), usando fallback estatico')
  }

  // Tentativa 3: estatico (fundo solido com Satori)
  const color = request.brandColor ?? BRAND_COLOR_DEFAULT
  const fonts = loadFonts()
  const element = React.createElement('div', {
    style: {
      display: 'flex',
      width,
      height,
      backgroundColor: color,
    },
  })

  const svg = await satori(element as Parameters<typeof satori>[0], { width, height, fonts })
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
  const buffer = Buffer.from(resvg.render().asPng())

  // TASK-2 ST004: sinalizar degradação para que a UI mostre placeholder profissional
  console.info('[image-pipeline] Usando fundo estatico (ambos providers falharam) — isDegraded=true')
  return {
    buffer,
    provider: 'static',
    isDegraded: true,
    degradedReason: 'Ideogram e Flux indisponíveis — arte será regenerada quando o serviço voltar.',
  }
}

// ─── Font Loading ─────────────────────────────────────────────────────────────

interface FontConfig {
  name:   string
  data:   Buffer
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  style:  'normal' | 'italic'
}

let _fonts: FontConfig[] | null = null

function loadFonts(): FontConfig[] {
  if (_fonts) return _fonts

  // Fonts são compartilhadas com o worker (mesmo repo)
  const fontsDir    = path.join(process.cwd(), 'workers', 'image-worker', 'fonts')
  const regularPath = path.join(fontsDir, 'Inter-Regular.ttf')
  const boldPath    = path.join(fontsDir, 'Inter-Bold.ttf')

  if (!fs.existsSync(regularPath) || !fs.existsSync(boldPath)) {
    throw new Error(
      `Fontes não encontradas em ${fontsDir}. Execute: cd workers/image-worker && sh scripts/download-fonts.sh`
    )
  }

  _fonts = [
    { name: 'Inter', data: fs.readFileSync(regularPath), weight: 400, style: 'normal' },
    { name: 'Inter', data: fs.readFileSync(boldPath),    weight: 700, style: 'normal' },
  ]
  return _fonts
}

// ─── Template Element Factory ─────────────────────────────────────────────────
// Overlay transparente sobre o asset do operador.
// Layout: texto no rodapé com fundo semitransparente (brand bar).

function buildTemplateOverlay(
  templateType: TemplateType,
  props:        Record<string, unknown>,
  dimensions:   { widthPx: number; heightPx: number }
): React.ReactElement {
  const headline    = (props['headline']    as string) ?? ''
  const subheadline = (props['subheadline'] as string) ?? ''
  const brandColor  = (props['brandColor']  as string) ?? '#4F46E5'

  return React.createElement('div', {
    style: {
      display:        'flex',
      flexDirection:  'column',
      width:          dimensions.widthPx,
      height:         dimensions.heightPx,
      position:       'relative',
      justifyContent: 'flex-end',
    },
  },
    // Brand bar no rodapé com texto
    React.createElement('div', {
      style: {
        display:         'flex',
        flexDirection:   'column',
        backgroundColor: `${brandColor}CC`, // 80% opacity via hex
        padding:         '24px 40px',
        gap:             8,
      },
    },
      headline ? React.createElement('span', {
        style: { color: '#FFFFFF', fontSize: 36, fontWeight: 700, fontFamily: 'Inter' },
      }, headline) : null,
      subheadline ? React.createElement('span', {
        style: { color: '#E2E8F0', fontSize: 22, fontWeight: 400, fontFamily: 'Inter' },
      }, subheadline) : null,
      React.createElement('span', {
        style: { color: '#94A3B8', fontSize: 14, fontWeight: 400, fontFamily: 'Inter' },
      }, templateType),
    ),
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * enqueueImageJob — Intake Review TASK-3 ST003 (CL-065/066)
 *
 * Valida que a dimensao requisitada para um canal logico e permitida antes
 * de enfileirar o render. Usado pelas API routes de image generation.
 *
 * Throws `InvalidDimensionError` com {channel, expected, received}.
 */
export function assertChannelDimension(
  channel: string,
  dim: { w: number; h: number }
): void {
  validateDimension(channel, dim)
}

/**
 * Renderiza um template como SVG string usando Satori.
 * Usa um overlay leve sobre o asset do operador (fundo transparente).
 *
 * Channel guard (TASK-3 ST003): se `channel` for informado, valida que a
 * dimensao registrada em IMAGE_DIMENSIONS[templateType] e permitida pelo canal.
 */
export async function renderTemplate(
  templateType: TemplateType,
  props:        Record<string, unknown>,
  channel?:     string
): Promise<string> {
  const fonts      = loadFonts()
  const dimensions = IMAGE_DIMENSIONS[templateType]
  if (channel) {
    assertChannelDimension(channel, { w: dimensions.widthPx, h: dimensions.heightPx })
  }
  const element    = buildTemplateOverlay(templateType, props, dimensions)

  const svg = await satori(element as Parameters<typeof satori>[0], {
    width:  dimensions.widthPx,
    height: dimensions.heightPx,
    fonts,
  })

  return svg
}

/**
 * Compõe imagem final: background (asset do operador) + SVG overlay.
 */
export async function composeFinalImage(
  svgString:        string,
  backgroundBuffer: Buffer,
  dimensions:       { widthPx: number; heightPx: number },
  format:           'png' | 'webp' = 'webp'
): Promise<Buffer> {
  // SVG → PNG via Resvg
  const resvg  = new Resvg(svgString, { fitTo: { mode: 'width', value: dimensions.widthPx } })
  const svgPng = resvg.render().asPng()

  // Composite: background (asset) + overlay (SVG)
  return sharp(backgroundBuffer)
    .resize(dimensions.widthPx, dimensions.heightPx, { fit: 'cover' })
    .composite([{ input: svgPng, blend: 'over' }])
    .toFormat(format)
    .toBuffer()
}
