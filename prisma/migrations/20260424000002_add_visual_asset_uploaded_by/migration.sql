-- Intake-Review TASK-2 ST002 (CL-CG-012): adiciona coluna uploaded_by a
-- visual_assets para permitir RLS per-user (ver migration 20260424000003).
--
-- Estrategia de backfill:
--   - Nullable para migrar sem quebrar linhas legacy (pre-upload UI)
--   - Rows com uploaded_by=NULL nao sao exibidas via RLS (ver
--     20260424000003). Ops deve auditar e reconciliar legacy rows.

ALTER TABLE "visual_assets"
  ADD COLUMN IF NOT EXISTS "uploaded_by" UUID;

CREATE INDEX IF NOT EXISTS "IDX_visual_assets_uploaded_by"
  ON "visual_assets" ("uploaded_by");
