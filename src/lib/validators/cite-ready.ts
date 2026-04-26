/**
 * cite-ready validator (M10.18) — soft warning helper.
 *
 * Verifica se a "resposta principal" do artigo aparece nos primeiros 2
 * paragrafos do markdown. Retorna { ok, warnings } sem bloquear publicacao.
 *
 * Heuristica:
 *  1. Os 2 primeiros paragrafos somados precisam ter pelo menos 200 chars
 *     (resposta substantiva, nao so abertura).
 *  2. Pelo menos um dos 2 primeiros paragrafos precisa conter um sinal de
 *     "resposta": numero, verbo de acao, palavra-chave do titulo, ou termo
 *     conclusivo (e, eh, sao, significa, ou seja, em resumo, basicamente).
 *  3. Headings (linhas que comecam com #) e listas iniciais nao contam como
 *     paragrafos para esta verificacao.
 */

const ANSWER_HINTS = [
  ' e ',
  ' eh ',
  ' sao ',
  ' significa ',
  ' ou seja ',
  ' em resumo ',
  ' basicamente ',
  'resposta',
  'principal',
  'porque',
]

export interface CiteReadyResult {
  ok: boolean
  warnings: string[]
}

export function checkCiteReady(contentMd: string, title?: string): CiteReadyResult {
  const warnings: string[] = []

  const paragraphs = contentMd
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0 && !block.startsWith('#') && !block.startsWith('- ') && !block.startsWith('* '))
    .slice(0, 2)

  if (paragraphs.length < 2) {
    warnings.push('cite-ready: artigo precisa de pelo menos 2 paragrafos antes de qualquer heading.')
    return { ok: false, warnings }
  }

  const headLength = paragraphs.reduce((acc, p) => acc + p.length, 0)
  if (headLength < 200) {
    warnings.push(
      `cite-ready: os 2 primeiros paragrafos somam ${headLength} chars (minimo recomendado: 200) para responder a busca direta.`,
    )
  }

  const headLower = paragraphs.join(' ').toLowerCase()
  const titleKeywords = (title ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 5)

  const hasHint = ANSWER_HINTS.some((hint) => headLower.includes(hint))
  const hasNumber = /\d/.test(headLower)
  const hasTitleEcho = titleKeywords.some((kw) => headLower.includes(kw))

  if (!hasHint && !hasNumber && !hasTitleEcho) {
    warnings.push(
      'cite-ready: os 2 primeiros paragrafos nao apresentam sinais de resposta direta (numero, palavra-chave do titulo ou termo conclusivo).',
    )
  }

  return { ok: warnings.length === 0, warnings }
}
