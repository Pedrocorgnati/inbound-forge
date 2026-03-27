// module-9: Satori Render Engine
// Rastreabilidade: TASK-2 ST001, INT-056, INT-060, FEAT-creative-generation-005
//
// CONSTRAINTS SATORI OBRIGATÓRIAS (verificadas em runtime nos templates):
//   - SOMENTE CSS flexbox (sem grid, sem position:absolute exceto no root)
//   - Fontes SOMENTE TTF/OTF/WOFF (NÃO WOFF2)
//   - ZERO hooks React nos templates
//   - ZERO imports dinâmicos
//   - width e height EXPLÍCITOS no elemento root

import satori from 'satori'
import * as fs from 'fs'
import * as path from 'path'
import type { TemplateType } from './types'
import { IMAGE_DIMENSIONS } from './constants'
import { getTemplateElement } from './templates'
import type { TemplateBaseProps } from './templates/types'

interface FontConfig {
  name:   string
  data:   Buffer
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  style:  'normal' | 'italic'
}

let _fonts: FontConfig[] | null = null

export function loadFonts(): FontConfig[] {
  if (_fonts) return _fonts

  const fontsDir = path.join(__dirname, '..', 'fonts')

  const regularPath = path.join(fontsDir, 'Inter-Regular.ttf')
  const boldPath    = path.join(fontsDir, 'Inter-Bold.ttf')

  if (!fs.existsSync(regularPath)) {
    throw new Error(`Fonte não encontrada: ${regularPath}. Execute scripts/download-fonts.sh`)
  }
  if (!fs.existsSync(boldPath)) {
    throw new Error(`Fonte não encontrada: ${boldPath}. Execute scripts/download-fonts.sh`)
  }

  _fonts = [
    { name: 'Inter', data: fs.readFileSync(regularPath), weight: 400, style: 'normal' },
    { name: 'Inter', data: fs.readFileSync(boldPath),    weight: 700, style: 'normal' },
  ]

  return _fonts
}

/**
 * Renderiza um template Satori e retorna SVG string.
 * Dimensões são determinadas pelo IMAGE_DIMENSIONS[templateType].
 */
export async function renderTemplate(
  templateType: TemplateType,
  props: TemplateBaseProps & Record<string, unknown>
): Promise<string> {
  const fonts      = loadFonts()
  const dimensions = IMAGE_DIMENSIONS[templateType]
  const element    = getTemplateElement(templateType, props)

  const svg = await satori(element as Parameters<typeof satori>[0], {
    width:  dimensions.widthPx,
    height: dimensions.heightPx,
    fonts,
  })

  return svg
}
