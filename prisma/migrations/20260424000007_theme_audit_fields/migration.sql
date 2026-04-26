-- TASK-7 (CL-TH-003, CL-TH-016) — campos de autoria e soft-delete em Theme.
-- archivedAt eh canonico para "arquivado"; status mantem workflow independente.

ALTER TABLE "themes"
  ADD COLUMN "created_by" VARCHAR(64),
  ADD COLUMN "archived_at" TIMESTAMP(3),
  ADD COLUMN "last_published_at" TIMESTAMP(3);

CREATE INDEX "IDX_themes_archived_at" ON "themes" ("archived_at");

-- Backfill: themes com status=REJECTED ganham archivedAt = updatedAt
-- (proxy estavel — nao ha rejectedAt consistente em todas as linhas legacy).
UPDATE "themes"
   SET "archived_at" = "updated_at"
 WHERE "status" = 'REJECTED'
   AND "archived_at" IS NULL;
