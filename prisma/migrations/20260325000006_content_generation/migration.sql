-- Migration: content_generation (module-8)
-- Adds missing fields to ContentAngleVariant and ContentRejection

-- Add content generation fields to content_angle_variants
ALTER TABLE "content_angle_variants"
  ADD COLUMN "char_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "hashtags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "cta_text" VARCHAR(200),
  ADD COLUMN "edited_body" TEXT,
  ADD COLUMN "generation_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add unique constraint for piece + angle + generationVersion
ALTER TABLE "content_angle_variants"
  ADD CONSTRAINT "UQ_content_angle_variant_piece_angle_version"
  UNIQUE ("piece_id", "angle", "generation_version");

-- Add angle field to content_rejections
ALTER TABLE "content_rejections"
  ADD COLUMN "angle" "ContentAngle";

-- Update char_count for existing records based on text length
UPDATE "content_angle_variants" SET "char_count" = LENGTH("text") WHERE "char_count" = 0;
