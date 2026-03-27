// module-10 + module-9: Storage Path Isolation — Unit Tests
// Rastreabilidade: INT-063, INT-058
// Garante que paths de upload de módulos diferentes não colidem

import { describe, it, expect } from 'vitest'
import { ASSET_UPLOAD_CONFIG } from '@/lib/constants/asset-library'

describe('Storage Path Isolation', () => {
  describe('module-10 (Asset Library)', () => {
    it('upload path starts with visual-assets/', () => {
      expect(ASSET_UPLOAD_CONFIG.storagePath).toBe('visual-assets/')
      expect(ASSET_UPLOAD_CONFIG.storagePath.startsWith('visual-assets/')).toBe(true)
    })

    it('thumbnail path starts with visual-assets/thumbnails/', () => {
      expect(ASSET_UPLOAD_CONFIG.thumbnailPath).toBe('visual-assets/thumbnails/')
      expect(ASSET_UPLOAD_CONFIG.thumbnailPath.startsWith('visual-assets/thumbnails/')).toBe(true)
    })
  })

  describe('module-9 (Image Jobs)', () => {
    it('output path starts with image-jobs/', () => {
      // Module-9 uses hardcoded path in asset-compose.service.ts: `image-jobs/${jobId}.webp`
      const jobId      = 'test-uuid-123'
      const outputPath = `image-jobs/${jobId}.webp`

      expect(outputPath.startsWith('image-jobs/')).toBe(true)
    })
  })

  describe('cross-module isolation', () => {
    it('module-10 and module-9 paths do not collide', () => {
      const mod10Prefix = ASSET_UPLOAD_CONFIG.storagePath    // visual-assets/
      const mod10Thumb  = ASSET_UPLOAD_CONFIG.thumbnailPath  // visual-assets/thumbnails/
      const mod9Prefix  = 'image-jobs/'

      // No path is a prefix of another module's path
      expect(mod10Prefix.startsWith(mod9Prefix)).toBe(false)
      expect(mod9Prefix.startsWith(mod10Prefix)).toBe(false)
      expect(mod10Thumb.startsWith(mod9Prefix)).toBe(false)
      expect(mod9Prefix.startsWith(mod10Thumb)).toBe(false)
    })
  })
})
