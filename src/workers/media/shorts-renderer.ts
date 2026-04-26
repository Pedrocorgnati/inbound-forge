/**
 * YouTube Shorts renderer — Inbound Forge
 * TASK-7 ST001 / CL-073 (pos-MVP)
 *
 * STUB — implementacao FFmpeg pendente (equipe de media).
 *
 * Razao do stub: composicao de video com slides, overlay de texto, transicoes
 * e trilha sonora requer (a) assets de media (intro/outro/fontes/soundtrack) que nao
 * existem no repo, (b) FFmpeg no runtime do worker (Railway custom image) e
 * (c) validacao de saida com ffprobe. Custo desproporcional para P3/pos-MVP.
 *
 * O que esta entregue:
 * - Interface publica `renderShort(options)` com contrato de entrada/saida
 * - Dockerfile.worker com FFmpeg instalado (ver arquivo correspondente)
 * - Canal adapter (youtube-channel.ts) com integracao na fila
 *
 * Para ativar: substituir corpo de `renderShort` pela implementacao real
 * usando `fluent-ffmpeg` e os assets em `src/lib/templates/shorts/`.
 */

export interface RenderShortOptions {
  articleId: string
  title: string
  highlights: string[]
  coverImageUrl?: string
  outputDir?: string
}

export interface RenderShortResult {
  filePath: string
  durationMs: number
}

export async function renderShort(_options: RenderShortOptions): Promise<RenderShortResult> {
  throw new Error(
    'renderShort nao implementado — aguardando assets de media e equipe FFmpeg. ' +
    'Ver src/workers/media/shorts-renderer.ts para detalhes do contrato.'
  )
}

export function extractHighlights(content: string, maxItems = 5): string[] {
  // Heuristica: captura H2s + primeira frase de cada paragrafo
  const h2Matches = content.match(/<h2[^>]*>(.*?)<\/h2>/gi) ?? []
  const h2Texts = h2Matches
    .map((h) => h.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean)
    .slice(0, maxItems)

  if (h2Texts.length >= maxItems) return h2Texts

  const paraMatches = content.match(/<p[^>]*>(.*?)<\/p>/gi) ?? []
  const firstSentences = paraMatches
    .map((p) => {
      const text = p.replace(/<[^>]+>/g, '').trim()
      return text.split(/\.\s/)[0]?.trim() ?? ''
    })
    .filter((s) => s.length > 20)
    .slice(0, maxItems - h2Texts.length)

  return [...h2Texts, ...firstSentences]
}
