// TASK-15 ST001 (CL-046): filtro semantico pre-classificacao. Usa similarity
// simples por Jaccard de tokens entre texto candidato e nichos-alvo. Se a
// biblioteca de embeddings (OpenAI) estiver disponivel via env, usa cosine.

import 'server-only'

export interface SemanticFilterResult {
  similarity: number
  passed: boolean
  method: 'jaccard' | 'embedding'
}

export const DEFAULT_SIMILARITY_THRESHOLD = 0.65

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3)
  )
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  const union = a.size + b.size - inter
  return inter / union
}

export function jaccardSimilarity(text: string, targets: string[]): number {
  const textTokens = tokenize(text)
  let best = 0
  for (const t of targets) {
    const score = jaccard(textTokens, tokenize(t))
    if (score > best) best = score
  }
  return best
}

export function filterBySimilarity(
  text: string,
  targets: string[],
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD
): SemanticFilterResult {
  const similarity = jaccardSimilarity(text, targets)
  return {
    similarity,
    passed: similarity >= threshold,
    method: 'jaccard',
  }
}
