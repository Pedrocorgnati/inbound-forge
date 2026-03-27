-- module-10: Asset Library Foundation
-- Migration: 20260326000001_module10_asset_library
-- Rastreabilidade: TASK-0 ST002, INT-063, PERF-003
-- Backward-compatible: somente ADD COLUMN nullable ou com default; RENAME não perde dados
--
-- ROLLBACK (executar na ordem inversa):
--   DROP INDEX IF EXISTS "IDX_visual_assets_file_type";
--   ALTER TABLE "visual_assets" DROP COLUMN IF EXISTS "updated_at";
--   ALTER TABLE "visual_assets" DROP COLUMN IF EXISTS "is_active";
--   ALTER TABLE "visual_assets" DROP COLUMN IF EXISTS "used_in_jobs";
--   ALTER TABLE "visual_assets" DROP COLUMN IF EXISTS "tags";
--   ALTER TABLE "visual_assets" DROP COLUMN IF EXISTS "alt_text";
--   ALTER TABLE "visual_assets" DROP COLUMN IF EXISTS "thumbnail_url";
--   ALTER TABLE "visual_assets" DROP COLUMN IF EXISTS "height_px";
--   ALTER TABLE "visual_assets" DROP COLUMN IF EXISTS "width_px";
--   ALTER TABLE "visual_assets" DROP COLUMN IF EXISTS "file_size_bytes";
--   ALTER TABLE "visual_assets" DROP COLUMN IF EXISTS "file_name";
--   ALTER TABLE "visual_assets" RENAME COLUMN "original_name" TO "name";
--   ALTER TABLE "visual_assets" RENAME COLUMN "file_type" TO "type";
--   ALTER TABLE "visual_assets" RENAME COLUMN "alt_text_old" TO "description";  -- apenas se necessário

-- ─── 1. Rename existing columns ───────────────────────────────────────────────

-- name → original_name (preserva dados existentes)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visual_assets' AND column_name = 'name'
  ) THEN
    ALTER TABLE "visual_assets" RENAME COLUMN "name" TO "original_name";
  END IF;
END $$;

-- type → file_type
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visual_assets' AND column_name = 'type'
  ) THEN
    ALTER TABLE "visual_assets" RENAME COLUMN "type" TO "file_type";
  END IF;
END $$;

-- description → alt_text
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visual_assets' AND column_name = 'description'
  ) THEN
    ALTER TABLE "visual_assets" RENAME COLUMN "description" TO "alt_text";
  END IF;
END $$;

-- ─── 2. Add new columns ────────────────────────────────────────────────────────

-- file_name: nome do arquivo gerado (populated no insert via service)
ALTER TABLE "visual_assets"
  ADD COLUMN IF NOT EXISTS "file_name" VARCHAR(255) NOT NULL DEFAULT '';

-- Backfill file_name a partir de original_name onde vazio
UPDATE "visual_assets" SET "file_name" = "original_name" WHERE "file_name" = '';

-- fileSizeBytes
ALTER TABLE "visual_assets"
  ADD COLUMN IF NOT EXISTS "file_size_bytes" INTEGER NOT NULL DEFAULT 0;

-- dimensões (nullable — SVG não tem dimensões raster)
ALTER TABLE "visual_assets"
  ADD COLUMN IF NOT EXISTS "width_px" INTEGER;

ALTER TABLE "visual_assets"
  ADD COLUMN IF NOT EXISTS "height_px" INTEGER;

-- thumbnail URL (nullable — SVG não gera thumbnail)
ALTER TABLE "visual_assets"
  ADD COLUMN IF NOT EXISTS "thumbnail_url" VARCHAR(512);

-- tags array (PostgreSQL array type)
ALTER TABLE "visual_assets"
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT '{}';

-- usedInJobs array — rastreia quais ImageJob usaram este asset
ALTER TABLE "visual_assets"
  ADD COLUMN IF NOT EXISTS "used_in_jobs" TEXT[] NOT NULL DEFAULT '{}';

-- soft delete
ALTER TABLE "visual_assets"
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- updatedAt
ALTER TABLE "visual_assets"
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- ─── 3. Índice em file_type ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "IDX_visual_assets_file_type"
  ON "visual_assets" ("file_type");
