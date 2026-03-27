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
import { IMAGE_DIMENSIONS }  from '@/lib/constants/image-worker'

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
 * Renderiza um template como SVG string usando Satori.
 * Usa um overlay leve sobre o asset do operador (fundo transparente).
 */
export async function renderTemplate(
  templateType: TemplateType,
  props:        Record<string, unknown>
): Promise<string> {
  const fonts      = loadFonts()
  const dimensions = IMAGE_DIMENSIONS[templateType]
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
