-- Intake Review TASK-2 (CL-029, CL-034) — MVP pain library defaults
-- Adiciona flag is_default + unicidade de titulo (para seed upsert idempotente)
-- em pain_library_entries.

ALTER TABLE "pain_library_entries"
  ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_pain_library_title"
  ON "pain_library_entries" ("title");

CREATE INDEX IF NOT EXISTS "IDX_pain_library_is_default"
  ON "pain_library_entries" ("is_default")
  WHERE "is_default" = true;
