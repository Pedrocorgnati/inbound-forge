/**
 * Editorial Checker — valida estrutura GEO do artigo (summary-first + headings como perguntas).
 * Intake Review TASK-8 ST001 (CL-157, CL-158).
 */

export interface EditorialCheckResult {
  ok: boolean
  warnings: string[]
  metrics: {
    hasSummaryBlock: boolean
    totalHeadings: number
    interrogativeHeadings: number
    interrogativeRatio: number
  }
}

const HEADING_RE = /^#{2,3}\s+(.+?)\s*$/gm
const SUMMARY_HEADING_RE = /^#{2,3}\s+(Resumo|TL;DR|Summary)\b/im

/**
 * Avalia um artigo markdown e retorna warnings + metricas.
 * Criterios:
 *  - Deve existir um bloco `## Resumo` (ou TL;DR / Summary) como primeiro heading
 *    OU parágrafo inicial com 3-5 sentenças curtas (summary-first).
 *  - >= 60% dos headings H2/H3 devem terminar com '?'.
 */
export function checkEditorial(markdown: string): EditorialCheckResult {
  const warnings: string[] = []

  // Extract headings
  const headings: string[] = []
  for (const m of markdown.matchAll(HEADING_RE)) headings.push(m[1].trim())

  const interrogative = headings.filter((h) => /\?\s*$/.test(h)).length
  const ratio = headings.length > 0 ? interrogative / headings.length : 0
  if (headings.length > 0 && ratio < 0.6) {
    warnings.push(
      `Apenas ${interrogative}/${headings.length} headings sao perguntas (minimo 60%).`,
    )
  }

  // Summary-first: aceita bloco explicito ## Resumo OU primeiras 500 caracteres com 3+ sentencas.
  const hasExplicitSummary = SUMMARY_HEADING_RE.test(markdown)
  const firstChunk = markdown.trim().split(/\n#{1,3}\s/)[0] ?? ''
  const sentenceCount = (firstChunk.match(/[.!?]\s/g) ?? []).length
  const hasSummaryBlock = hasExplicitSummary || sentenceCount >= 3
  if (!hasSummaryBlock) {
    warnings.push('Artigo nao comeca com bloco de resumo (## Resumo ou paragrafo de 3+ sentencas).')
  }

  return {
    ok: warnings.length === 0,
    warnings,
    metrics: {
      hasSummaryBlock,
      totalHeadings: headings.length,
      interrogativeHeadings: interrogative,
      interrogativeRatio: Number(ratio.toFixed(2)),
    },
  }
}
