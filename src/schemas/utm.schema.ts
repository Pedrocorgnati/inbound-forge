import { z } from 'zod'

export const GenerateUTMSchema = z.object({
  postId: z.string().uuid(),
})

export type GenerateUTMInput = z.infer<typeof GenerateUTMSchema>
