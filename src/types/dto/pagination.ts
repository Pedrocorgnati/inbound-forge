import { z } from 'zod'
import { BUSINESS_RULES } from '../constants'

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int()
    .min(1)
    .max(BUSINESS_RULES.MAX_PAGE_SIZE)
    .default(BUSINESS_RULES.DEFAULT_PAGE_SIZE),
})

export type PaginationInput = z.infer<typeof PaginationSchema>
