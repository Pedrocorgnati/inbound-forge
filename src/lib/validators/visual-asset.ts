// module-10: Asset Library — Zod Validators
// Rastreabilidade: TASK-1 ST001, INT-063, PERF-003
// Error Catalog: VAL_001, VAL_002, VAL_003

import { z } from 'zod'
import { ASSET_UPLOAD_CONFIG } from '@/lib/constants/asset-library'

// ─── Upload Validation ────────────────────────────────────────────────────────

export const uploadAssetSchema = z.object({
  file: z
    .instanceof(File, { message: 'Campo "file" ausente na requisição.' }) // VAL_001
    .refine(
      (f) => f.size <= ASSET_UPLOAD_CONFIG.maxFileSizeBytes,
      (f) => ({
        message: `${f.name} excede 5MB (atual: ${(f.size / 1_000_000).toFixed(1)}MB)`, // VAL_003
      })
    )
    .refine(
      (f) => (ASSET_UPLOAD_CONFIG.allowedTypes as readonly string[]).includes(f.type),
      'Tipo não suportado. Use PNG, JPG, WebP ou SVG.' // VAL_002
    ),
  altText: z.string().max(200).optional(),
})

export type UploadAssetInput = z.infer<typeof uploadAssetSchema>

// ─── Update Validation ────────────────────────────────────────────────────────

export const updateAssetSchema = z.object({
  altText: z.string().max(200).optional(),
  tags:    z.array(z.string().max(50)).max(20).optional(),
})

export type UpdateAssetInput = z.infer<typeof updateAssetSchema>

// ─── List Params Validation ───────────────────────────────────────────────────

export const listAssetsSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(24),
  fileType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']).optional(),
  tag:      z.string().max(50).optional(),
})

export type ListAssetsInput = z.infer<typeof listAssetsSchema>

// ─── Asset ID Validation ─────────────────────────────────────────────────────

export const assetIdSchema = z.string().uuid({ message: 'ID de asset inválido.' }) // VAL_002
