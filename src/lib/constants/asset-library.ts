// module-10: Asset Library — Upload Constants
// Rastreabilidade: TASK-0 ST002, INT-063, PERF-003, FEAT-creative-generation-006
// Zero magic numbers — sempre importar estas constantes

import type { AssetFileType } from '@/types/visual-asset'

// ─── Upload Configuration ─────────────────────────────────────────────────────

export const ASSET_UPLOAD_CONFIG = {
  maxFileSizeBytes:    5_000_000,  // 5MB — PERF-003
  maxFilesPerBatch:    10,          // máximo de arquivos por upload simultâneo
  allowedTypes: [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
  ] as AssetFileType[],
  allowedExtensions:   ['.png', '.jpg', '.jpeg', '.webp', '.svg'] as const,
  thumbnailDimensions: { width: 200, height: 200 } as const,
  storagePath:         'visual-assets/',            // subpasta no bucket
  thumbnailPath:       'visual-assets/thumbnails/', // thumbnails no bucket
  pageSize:            24,                          // grid 4×6 desktop, 2×12 mobile — PERF-002
} as const

export type AllowedAssetType = typeof ASSET_UPLOAD_CONFIG.allowedTypes[number]

// ─── Error Messages (alinhados ao ERROR-CATALOG) ──────────────────────────────

export const ASSET_ERROR_MESSAGES = {
  VAL_001: 'Campo "file" ausente na requisição.',
  VAL_002: 'Tipo não suportado. Use PNG, JPG, WebP ou SVG.',
  VAL_003: (fileName: string, sizeMb: string) =>
    `${fileName} excede 5MB (atual: ${sizeMb}MB)`,
  SYS_001: 'Erro ao fazer upload. Tente novamente.',
  AUTH_001: 'Sessão expirada. Faça login novamente.',
} as const
