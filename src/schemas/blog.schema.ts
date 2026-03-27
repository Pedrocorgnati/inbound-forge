import { z } from 'zod'

export const CreateBlogArticleSchema = z.object({
  contentPieceId: z.string().uuid().nullable().optional(),
  title: z.string().min(3).max(500),
  excerpt: z.string().min(10).max(500),
  body: z.string().min(50),
  featuredImageUrl: z.string().url().nullable().optional(),
  metaTitle: z.string().min(3).max(70),
  metaDescription: z.string().min(10).max(160),
  tags: z.array(z.string()).default([]),
  jsonLd: z.string().nullable().optional(),
})

export const UpdateBlogArticleSchema = z.object({
  title: z.string().max(500).optional(),
  excerpt: z.string().max(500).optional(),
  body: z.string().optional(),
  featuredImageUrl: z.string().url().nullable().optional(),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  tags: z.array(z.string()).optional(),
  jsonLd: z.string().nullable().optional(),
})

export const ListBlogSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED']).optional(),
})

export type CreateBlogArticleInput = z.infer<typeof CreateBlogArticleSchema>
export type UpdateBlogArticleInput = z.infer<typeof UpdateBlogArticleSchema>
