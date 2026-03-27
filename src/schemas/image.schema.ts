import { z } from 'zod'

export const GenerateImageSchema = z.object({
  contentPieceId: z.string().uuid(),
  templateType: z.enum(['CAROUSEL', 'STATIC']),
})

export type GenerateImageInput = z.infer<typeof GenerateImageSchema>
