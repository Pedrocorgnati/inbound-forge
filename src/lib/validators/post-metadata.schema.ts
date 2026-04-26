/**
 * TASK-11/ST001 (CL-218) — Schema de metadata do blog post.
 */
import { z } from 'zod'

export const postMetadataSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug invalido'),
  tags: z.array(z.string().min(1)).max(8, 'Maximo 8 tags').default([]),
  featuredImageUrl: z.string().url().nullable().optional(),
  coverImageAlt: z.string().max(255).nullable().optional(),
  authorName: z.string().min(1).max(255),
  publishedAt: z.string().datetime().nullable().optional(),
  metaTitle: z.string().max(60).nullable().optional(),
  metaDescription: z.string().max(160).nullable().optional(),
  canonicalUrl: z.string().url().nullable().optional(),
})

export type PostMetadataInput = z.infer<typeof postMetadataSchema>
