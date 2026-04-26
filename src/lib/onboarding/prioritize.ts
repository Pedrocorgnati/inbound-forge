// Intake Review TASK-7 ST001+ST005 (CL-027) — prioritizacao deterministica
// dos steps do onboarding guiado.
//
// Heuristica:
//   1. Steps incompletos obrigatorios vem antes.
//   2. Dentro de incompletos, steps com cases/pains *quantificaveis* recebem
//      boost (agilizam a ativacao do motor de temas).
//   3. Steps opcionais completam a cauda.
//   4. Steps completados sao listados por ultimo (para consulta/revisao).
//
// Funcao PURA: input -> output deterministico. Sem efeitos colaterais.

export interface PrioritizeStep {
  id: number | string
  done?: boolean
  optional?: boolean
  key?: string
}

export interface PrioritizeCase {
  id: string
  metric?: number | null
  result?: { metric?: number | null } | null
  hasQuantifiableResult?: boolean
}

export interface PrioritizeOptions {
  cases?: PrioritizeCase[]
  progress?: Record<string, boolean>
}

const QUANTIFIABLE_BOOST = 10

function hasQuantifiableCases(
  step: PrioritizeStep,
  cases: PrioritizeCase[] | undefined,
): boolean {
  if (!cases || cases.length === 0) return false
  if (step.key !== 'first-case' && step.key !== 'cases') return false
  return cases.some(
    (c) =>
      c.hasQuantifiableResult === true ||
      typeof c.metric === 'number' ||
      typeof c.result?.metric === 'number',
  )
}

function baseScore(step: PrioritizeStep): number {
  if (step.done) return -100
  if (step.optional) return 10
  return 100
}

export function prioritize<T extends PrioritizeStep>(
  steps: T[],
  options: PrioritizeOptions = {},
): T[] {
  const { cases, progress } = options
  const withScores = steps.map((step, idx) => {
    const progressFlag = progress?.[String(step.id)]
    const effective: PrioritizeStep = {
      ...step,
      done: typeof progressFlag === 'boolean' ? progressFlag : step.done,
    }
    let score = baseScore(effective)
    if (!effective.done && hasQuantifiableCases(effective, cases)) {
      score += QUANTIFIABLE_BOOST
    }
    return { step, score, idx, done: effective.done }
  })
  withScores.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score
    return a.idx - b.idx
  })
  return withScores.map((w) => w.step)
}
