-- Migration: theme_scoring_engine
-- Módulo: module-7
-- Criado por: auto-flow execute (TASK-0/ST001)
-- Compatibilidade: backward-compatible (todos os campos têm DEFAULT)

-- ─── NicheOpportunity: add isGeoReady ────────────────────────────────────────

ALTER TABLE "niche_opportunities"
  ADD COLUMN IF NOT EXISTS "is_geo_ready" BOOLEAN NOT NULL DEFAULT false;

-- ─── Theme: change conversionScore Float? → Int DEFAULT 0 ────────────────────
-- Usa USING para converter NULL/float existentes para int sem breaking change

ALTER TABLE "themes"
  ALTER COLUMN "conversion_score" TYPE INTEGER
    USING COALESCE(ROUND("conversion_score"::numeric)::integer, 0),
  ALTER COLUMN "conversion_score" SET DEFAULT 0,
  ALTER COLUMN "conversion_score" SET NOT NULL;

-- ─── Theme: add scoring decomposition fields ──────────────────────────────────

ALTER TABLE "themes"
  ADD COLUMN IF NOT EXISTS "pain_relevance_score" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "case_strength_score"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "geo_multiplier"        FLOAT   NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS "recency_bonus"          FLOAT   NOT NULL DEFAULT 1.0;

-- ─── Theme: add rejection tracking fields ────────────────────────────────────

ALTER TABLE "themes"
  ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejected_by" VARCHAR(20);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "IDX_themes_conversion_score"
  ON "themes" ("conversion_score" DESC);
