// Module-11: Blog Article — Zod Validators
// Rastreabilidade: TASK-2 ST001, FEAT-publishing-blog-001, FEAT-publishing-blog-006
// Error Catalog: VAL_001, VAL_020, BLOG_020, BLOG_050

import { z } from 'zod'
import { MAX_META_DESCRIPTION_LENGTH, MAX_META_TITLE_LENGTH } from '@/lib/constants/blog'

// ─── Create ───────────────────────────────────────────────────────────────────

export const createArticleSchema = z.object({
  title: z.string().min(5, 'Título deve ter pelo menos 5 caracteres'), // VAL_001
  slug: z.string()
    .min(3, 'Slug deve ter pelo menos 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  body: z.string().min(100, 'Conteúdo deve ter pelo menos 100 caracteres'),
  excerpt: z.string().min(1, 'Excerpt é obrigatório').max(500, 'Excerpt máximo 500 chars'),
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  metaTitle: z.string().max(MAX_META_TITLE_LENGTH, `metaTitle máximo ${MAX_META_TITLE_LENGTH} chars`).optional(),
  metaDescription: z
    .string()
    .max(MAX_META_DESCRIPTION_LENGTH, `metaDescription máximo ${MAX_META_DESCRIPTION_LENGTH} chars`) // VAL_020
    .optional(),
  canonicalUrl: z.string().url('URL canônica inválida').optional().or(z.literal('')),
  tags: z.array(z.string().max(50)).max(20).default([]),
  ctaType: z.enum(['WHATSAPP', 'BLOG', 'CONTACT_FORM']).optional(),
  ctaUrl: z.string().url('URL do CTA inválida').optional().or(z.literal('')),
  ctaLabel: z.string().max(100, 'Label do CTA máximo 100 chars').optional(),
  hreflang: z.record(z.string(), z.string()).optional(),
  authorName: z.string().min(1).default('Pedro Corgnati'),
  changeNote: z.string().max(500).optional(),
})

export type CreateArticleInput = z.infer<typeof createArticleSchema>

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateArticleSchema = createArticleSchema.partial().extend({
  changeNote: z.string().max(500).optional(),
})

export type UpdateArticleInput = z.infer<typeof updateArticleSchema>

// ─── Approve ─────────────────────────────────────────────────────────────────

export const approveArticleSchema = z.object({
  approvedBy: z.string().min(1, 'approvedBy é obrigatório'),
  note: z.string().max(500).optional(),
})

export type ApproveArticleInput = z.infer<typeof approveArticleSchema>

// ─── List Params ─────────────────────────────────────────────────────────────

export const listArticlesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']).optional(),
})

export type ListArticlesInput = z.infer<typeof listArticlesSchema>
