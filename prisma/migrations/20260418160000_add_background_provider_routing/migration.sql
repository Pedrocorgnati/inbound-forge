-- TASK-2 ST003 — Background provider routing (CL-042, CL-141)

ALTER TABLE "image_jobs"
  ADD COLUMN "background_provider" VARCHAR(20),
  ADD COLUMN "background_needs_text" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "image_templates"
  ADD COLUMN "background_needs_text" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: templates cujo templateType sugere texto
UPDATE "image_templates"
SET "background_needs_text" = true
WHERE "template_type" IN ('ERROR_CARD', 'SOLUTION_CARD', 'BEFORE_AFTER', 'BACKSTAGE_CARD');
