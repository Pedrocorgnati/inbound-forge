-- TASK-13 ST001 (CL-039): coluna sort_order para drag-and-drop em KB

ALTER TABLE "case_library_entries" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "pain_library_entries" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "solution_patterns"     ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "objections"            ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- Backfill por created_at (ordem cronologica como base)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "created_at") AS rn
  FROM "case_library_entries"
)
UPDATE "case_library_entries" SET "sort_order" = ranked.rn FROM ranked WHERE "case_library_entries".id = ranked.id;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "created_at") AS rn
  FROM "pain_library_entries"
)
UPDATE "pain_library_entries" SET "sort_order" = ranked.rn FROM ranked WHERE "pain_library_entries".id = ranked.id;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "created_at") AS rn
  FROM "solution_patterns"
)
UPDATE "solution_patterns" SET "sort_order" = ranked.rn FROM ranked WHERE "solution_patterns".id = ranked.id;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "created_at") AS rn
  FROM "objections"
)
UPDATE "objections" SET "sort_order" = ranked.rn FROM ranked WHERE "objections".id = ranked.id;
