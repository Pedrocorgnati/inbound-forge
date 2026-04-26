-- TASK-14 ST001 (CL-119): suporte a agendamento recorrente
ALTER TABLE "posts"
  ADD COLUMN "recurrence_rule" VARCHAR(255),
  ADD COLUMN "recurrence_parent_id" TEXT;

CREATE INDEX "IDX_posts_recurrence_parent" ON "posts" ("recurrence_parent_id");
