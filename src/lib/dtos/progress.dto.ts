import { z } from 'zod'

export const ProgressCounterDto = z.object({
  count: z.number().int().min(0),
  threshold: z.number().int().min(1),
  unlocked: z.boolean(),
})

export const KnowledgeProgressDto = z.object({
  cases: ProgressCounterDto,
  pains: ProgressCounterDto,
  patterns: ProgressCounterDto,
  objections: ProgressCounterDto,
  /** true quando cases.count >= cases.threshold */
  overallUnlocked: z.boolean(),
  /** Mensagem contextual para guiar o próximo passo do operador */
  nextNudge: z.string().nullable(),
})

export type KnowledgeProgress = z.infer<typeof KnowledgeProgressDto>
