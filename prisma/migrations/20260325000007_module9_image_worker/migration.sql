-- module-9: Image Worker Foundation
-- Migration: 20260325000007_module9_image_worker
-- Rastreabilidade: TASK-0 ST003, INT-056, INT-060
-- Backward-compatible: somente ADD COLUMN nullable ou com default; DROP CONSTRAINT apenas do UNIQUE
--
-- ROLLBACK (executar na ordem inversa):
--   ALTER TABLE "image_jobs" DROP CONSTRAINT IF EXISTS "image_jobs_template_id_fkey";
--   DROP INDEX IF EXISTS "IDX_image_jobs_content_piece_id";
--   ALTER TABLE "image_jobs" DROP COLUMN IF EXISTS "completed_at";
--   ALTER TABLE "image_jobs" DROP COLUMN IF EXISTS "metadata";
--   ALTER TABLE "image_jobs" DROP COLUMN IF EXISTS "retry_count";
--   ALTER TABLE "image_jobs" DROP COLUMN IF EXISTS "image_url";
--   ALTER TABLE "image_jobs" DROP COLUMN IF EXISTS "prompt";
--   ALTER TABLE "image_jobs" DROP COLUMN IF EXISTS "template_id";
--   ALTER TABLE "image_jobs" ALTER COLUMN "content_piece_id" SET NOT NULL;
--   ALTER TABLE "image_jobs" ADD CONSTRAINT "image_jobs_content_piece_id_key" UNIQUE ("content_piece_id");
--   ALTER TABLE "image_templates" DROP COLUMN IF EXISTS "updated_at";
--   ALTER TABLE "image_templates" DROP COLUMN IF EXISTS "config_json";
--   ALTER TABLE "image_templates" DROP COLUMN IF EXISTS "channel";
--   ALTER TABLE "image_templates" DROP COLUMN IF EXISTS "template_type";
--   ALTER TABLE "worker_healths" DROP COLUMN IF EXISTS "metadata";

-- ─── 1. Extend ImageType enum ──────────────────────────────────────────────────
ALTER TYPE "ImageType" ADD VALUE IF NOT EXISTS 'STATIC_LANDSCAPE';
ALTER TYPE "ImageType" ADD VALUE IF NOT EXISTS 'STATIC_PORTRAIT';
ALTER TYPE "ImageType" ADD VALUE IF NOT EXISTS 'VIDEO_COVER';
ALTER TYPE "ImageType" ADD VALUE IF NOT EXISTS 'BEFORE_AFTER';
ALTER TYPE "ImageType" ADD VALUE IF NOT EXISTS 'ERROR_CARD';
ALTER TYPE "ImageType" ADD VALUE IF NOT EXISTS 'SOLUTION_CARD';
ALTER TYPE "ImageType" ADD VALUE IF NOT EXISTS 'BACKSTAGE_CARD';

-- ─── 2. Update image_jobs ──────────────────────────────────────────────────────

-- Make content_piece_id nullable and remove unique constraint
ALTER TABLE "image_jobs" ALTER COLUMN "content_piece_id" DROP NOT NULL;
ALTER TABLE "image_jobs" DROP CONSTRAINT IF EXISTS "image_jobs_content_piece_id_key";

-- Add new columns (all nullable or with default — backward-compatible)
ALTER TABLE "image_jobs" ADD COLUMN IF NOT EXISTS "template_id"   TEXT;
ALTER TABLE "image_jobs" ADD COLUMN IF NOT EXISTS "prompt"         TEXT;
ALTER TABLE "image_jobs" ADD COLUMN IF NOT EXISTS "image_url"      VARCHAR(512);
ALTER TABLE "image_jobs" ADD COLUMN IF NOT EXISTS "retry_count"    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "image_jobs" ADD COLUMN IF NOT EXISTS "metadata"       JSONB;
ALTER TABLE "image_jobs" ADD COLUMN IF NOT EXISTS "completed_at"   TIMESTAMPTZ;

-- Add index on content_piece_id (now non-unique)
CREATE INDEX IF NOT EXISTS "IDX_image_jobs_content_piece_id"
  ON "image_jobs"("content_piece_id");

-- ─── 3. Update image_templates ────────────────────────────────────────────────

ALTER TABLE "image_templates" ADD COLUMN IF NOT EXISTS "template_type" VARCHAR(50);
ALTER TABLE "image_templates" ADD COLUMN IF NOT EXISTS "channel"       VARCHAR(50) NOT NULL DEFAULT 'instagram';
ALTER TABLE "image_templates" ADD COLUMN IF NOT EXISTS "config_json"   JSONB;
ALTER TABLE "image_templates" ADD COLUMN IF NOT EXISTS "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── 4. FK: image_jobs → image_templates ──────────────────────────────────────

ALTER TABLE "image_jobs"
  ADD CONSTRAINT "image_jobs_template_id_fkey"
  FOREIGN KEY ("template_id")
  REFERENCES "image_templates"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- ─── 5. Update worker_healths ─────────────────────────────────────────────────

ALTER TABLE "worker_healths" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
