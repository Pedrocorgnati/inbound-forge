// module-10: Asset Library — TypeScript Types
// Rastreabilidade: TASK-0 ST001, INT-063, FEAT-creative-generation-004
// Zero magic strings — usar AssetFileType union type em todo o código

// ─── Core Types ───────────────────────────────────────────────────────────────

export type AssetFileType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/svg+xml'

export interface VisualAsset {
  id:            string
  fileName:      string        // nome gerado (ex: clxxx.png)
  originalName:  string        // nome original do arquivo enviado
  fileType:      AssetFileType
  fileSizeBytes: number
  widthPx:       number | null
  heightPx:      number | null
  storageUrl:    string        // URL pública no Supabase Storage
  thumbnailUrl:  string | null // URL do thumbnail WebP 200×200
  altText:       string | null
  tags:          string[]
  usedInJobs:    string[]      // IDs de ImageJob que usaram este asset
  isActive:      boolean
  createdAt:     Date
  updatedAt:     Date
}

// ─── Upload Progress ──────────────────────────────────────────────────────────

export type UploadStatus = 'uploading' | 'done' | 'error'

export interface UploadProgress {
  fileName: string
  progress: number     // 0–100
  status:   UploadStatus
  error?:   string
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface AssetFilter {
  fileType?: AssetFileType
  tags?:     string[]
  search?:   string
  page?:     number
  limit?:    number
}

// ─── Paginated Response ───────────────────────────────────────────────────────

export interface PaginatedAssets {
  items:      VisualAsset[]
  total:      number
  page:       number
  totalPages: number
}
